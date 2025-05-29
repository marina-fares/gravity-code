from rest_framework import permissions, generics
from rest_framework.response import Response
from ..models.models_sessions import Session, Product, Booking
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
        currentSessionDetails = Session.objects.get(id=session_id)
        allSessions = Session.objects.filter(id__gte=session_id, start_time__date=currentSessionDetails.start_time.date())
        serializer = SessionSerializer(allSessions, many=True).data
        return Response(serializer)

    def post(self, request):
        # this return all sessions for spesific product and date
        date_string = request.data['payload']['date']
        selectedProduct = request.data['payload']['product']
        selectedSessionDate = datetime.strptime(date_string, "%Y-%m-%d").date()
        allSessions = Session.objects.filter(product=selectedProduct, start_time__date=selectedSessionDate)
        serializer = SessionSerializer(allSessions, many=True)
        return Response(serializer.data)

#I will use this class to update the spesific session
#I will use this to block number of seats
class OneSessionApi(generics.GenericAPIView):
    """
    This class is used to make a request to the Square API.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SessionSerializer

    def get(self, request, session_id):
        """
        This method is used to make a request to the Square API.
        """
        currentSessionDetails = Session.objects.get(id=session_id)
        allSessions = Session.objects.filter(id__gte=session_id, start_time__date=currentSessionDetails.start_time.date())
        serializer = SessionSerializer(allSessions, many=True).data
        return Response(serializer)

    def post(self, request, session_id):
        """
        This method is used to make a request to the Square API.
        """
        blocks = request.data['numbers']
        currentSession = Session.objects.get(id=session_id)
        currentSession.block_seats = int(blocks)

        product = Product.objects.get(id=currentSession.product.id)
        all_bookkings_num = sum(Booking.objects.filter(session__id=currentSession.id).exclude(status='refunded').values_list('number_of_players', flat=True))
        currentSession.available_seats = product.max_num - all_bookkings_num - int(blocks)
        currentSession.save()

        serializer = SessionSerializer(currentSession)
        return Response(serializer.data)



