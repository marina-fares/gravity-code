from rest_framework import permissions, generics
from rest_framework.response import Response
from ..models.models_sessions import Session
from Main.serializers.session_serializer import SessionSerializer


class SessionApi(generics.GenericAPIView):
    """
    This class is used to make a request to the Square API.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SessionSerializer

    def get(self, request):
        """
        This method is used to make a request to the Square API.
        """
        current_user = self.request.user
        if current_user.is_superuser:
            all_products = Session.objects.all()
            serializer = SessionSerializer(all_products).data
        else:
            current_user_groups = current_user.groups.all()
            current_user_group_names = [group.name for group in current_user_groups]
            group_products = Session.objects.filter(group__name__in=current_user_group_names)
            serializer = SessionSerializer(group_products).data
        return Response(serializer)



