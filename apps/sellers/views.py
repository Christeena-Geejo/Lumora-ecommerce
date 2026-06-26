from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Seller
from .serializers import SellerSerializer
from apps.users.permissions import IsAdmin

class SellerRegisterView(generics.CreateAPIView):
    serializer_class = SellerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        user.role = 'seller'
        user.save()
        serializer.save(user=user)

class SellerDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = SellerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return generics.get_object_or_404(Seller, user=self.request.user)

class SellerApprovalView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        seller = generics.get_object_or_404(Seller, pk=pk)
        action = request.data.get('action')  # 'approve' or 'reject'
        if action == 'approve':
            seller.is_approved = True
            seller.save()
            return Response({'message': f'Seller shop {seller.shop_name} approved.'})
        elif action == 'reject':
            seller.is_approved = False
            seller.save()
            return Response({'message': f'Seller shop {seller.shop_name} rejected/disabled.'})
        return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)
