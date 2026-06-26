import razorpay
import json
import hmac
import hashlib
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.shortcuts import get_object_or_404
from apps.orders.models import Order, OrderTracking

# Initialize Razorpay client
try:
    client = razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )
except Exception:
    client = None


class CreatePaymentView(APIView):
    """Create a Razorpay order for payment.
    Accepts amount directly so frontend can create payment before Django order exists.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = ()

    def post(self, request):
        amount = request.data.get('amount')
        order_id = request.data.get('order_id')  # optional Django order ID
        
        if not amount:
            return Response({'error': 'amount is required (in INR)'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount_float = float(amount)
            if amount_float <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

        if not client:
            return Response({'error': 'Razorpay client is not initialized. Check API keys.'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            razorpay_order = client.order.create({
                'amount': int(amount_float * 100),  # Convert to paise
                'currency': 'INR',
                'receipt': f'order_{order_id}' if order_id else f'receipt_{int(amount_float * 100)}',
                'notes': {
                    'order_id': str(order_id) if order_id else '',
                }
            })
            return Response({
                'razorpay_order_id': razorpay_order['id'],
                'razorpay_key_id': settings.RAZORPAY_KEY_ID,
                'amount': razorpay_order['amount'],
                'currency': razorpay_order['currency'],
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PaymentVerifyView(APIView):
    """Verify Razorpay payment signature after successful checkout."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = ()

    def post(self, request):
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_order_id = request.data.get('razorpay_order_id')
        razorpay_signature = request.data.get('razorpay_signature')

        if not all([razorpay_payment_id, razorpay_order_id, razorpay_signature]):
            return Response(
                {'error': 'razorpay_payment_id, razorpay_order_id, and razorpay_signature are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not client:
            return Response({'error': 'Razorpay client not initialized'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            # Verify signature
            client.utility.verify_payment_signature({
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature,
            })

            return Response({
                'verified': True,
                'payment_id': razorpay_payment_id,
                'message': 'Payment verified successfully'
            })

        except razorpay.errors.SignatureVerificationError:
            return Response({
                'verified': False,
                'error': 'Payment signature verification failed'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class PaymentWebhookView(APIView):
    """Razorpay webhook for async payment events."""
    permission_classes = []
    authentication_classes = ()

    def post(self, request):
        payload = request.body
        sig = request.headers.get('X-Razorpay-Signature')
        webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET

        if not client:
            return Response({'error': 'Razorpay client not initialized'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            client.utility.verify_webhook_signature(
                payload.decode('utf-8'), sig, webhook_secret
            )
        except Exception:
            return Response({'error': 'Signature verification failed'}, 
                          status=status.HTTP_400_BAD_REQUEST)

        event = request.data.get('event')
        if event == 'payment.captured':
            entity = request.data['payload']['payment']['entity']
            payment_id = entity.get('id')
            notes = entity.get('notes', {})

            # Try to find and update Django order if exists
            order = None
            if 'order_id' in notes and notes['order_id']:
                try:
                    order = Order.objects.get(id=int(notes['order_id']))
                    order.status = 'confirmed'
                    order.payment_status = 'PAID'
                    order.save()

                    OrderTracking.objects.create(
                        order=order,
                        status='confirmed',
                        description=f'Payment captured via Razorpay. Payment ID: {payment_id}'
                    )
                except (Order.DoesNotExist, ValueError):
                    pass

        return Response(status=status.HTTP_200_OK)
