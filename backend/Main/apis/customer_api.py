from rest_framework import permissions, generics
from rest_framework.response import Response
from ..models.models_sessions import Customer
from Main.serializers.customer_serializer import CustomerSerializer
from datetime import datetime

class CustomerApi(generics.GenericAPIView):
    """
    This class is used to make a request to the Square API.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CustomerSerializer

    def get(self, request):
        """
        This method is used to make a request to the Square API.
        """
        current_user = self.request.user
        if current_user.is_superuser:
            customers = Customer.objects.all()
        else:
            current_user_groups = current_user.groups.all()
            current_user_group_names = [group.name for group in current_user_groups]
            customers = Customer.objects.filter(group__name__in=current_user_group_names)
        serializer = CustomerSerializer(customers, many=True)
        return Response(serializer.data)

    # def post(self, request):
        # this return all sessions for spesific product and date
        # date_string = request.data['payload']['date']
        # selectedProduct = request.data['payload']['product']
        # selectedSessionDate = datetime.strptime(date_string, "%Y-%m-%d").date()
        # allSessions = Customer.objects.filter(product=selectedProduct, start_time__date=selectedSessionDate)
        # serializer = SessionSerializer(allSessions, many=True)
        # return Response(serializer.data)



