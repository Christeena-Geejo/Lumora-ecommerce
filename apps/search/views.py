from rest_framework.views import APIView
from apps.products.views import ProductSearchView, ElasticSearchView

class GlobalSearchView(APIView):
    permission_classes = []
    
    def get(self, request):
        mode = request.query_params.get('mode', 'basic')
        if mode == 'elastic':
            return ElasticSearchView().get(request)
        return ProductSearchView().get(request)
