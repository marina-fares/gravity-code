from rest_framework import permissions, generics
from rest_framework.response import Response
from ..models.models_sessions import Session, Product
from Main.serializers.session_serializer import SessionSerializer
from datetime import datetime

class SessionApi(generics.GenericAPIView):
    """
    This class is used to make a request to the Square API.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SessionSerializer

    def get(self, request, session_id):
        """
        This method is used to make a request to the Square API.
        """
        sessionDetails = Session.objects.get(id=session_id)
        serializer = SessionSerializer(sessionDetails).data
        return Response(serializer)

    def post(self, request):
        # this return all sessions for spesific product and date
        date_string = request.data['payload']['date']
        selectedProduct = request.data['payload']['product']
        selectedSessionDate = datetime.strptime(date_string, "%Y-%m-%d").date()
        allSessions = Session.objects.filter(product=selectedProduct, start_time__date=selectedSessionDate)
        serializer = SessionSerializer(allSessions, many=True)
        return Response(serializer.data)



