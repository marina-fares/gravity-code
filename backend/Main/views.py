# from django.shortcuts import render
# from .admin.session import DefaultSessionAdminForm

# def select_weekdays(request):
#     form = DefaultSessionAdminForm(request.POST or None)
#     if request.method == "POST" and form.is_valid():
#         # Handle valid form submission
#         print(form.cleaned_data)
#     return render(request, 'Main/select_weekdays.html', {'form': form})
