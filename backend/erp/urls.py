from django.urls import path
from . import api

urlpatterns = [
    path('auth/csrf/', api.csrf), path('auth/login/', api.sign_in), path('auth/logout/', api.sign_out), path('auth/me/', api.me),
    path('me/profile/', api.my_profile), path('me/dashboard/', api.my_dashboard), path('me/progress/', api.my_progress),
    path('courses/', api.courses), path('me/registrations/', api.my_registrations), path('me/routine/', api.my_routine),
    path('me/results/', api.my_results), path('me/attendance/', api.my_attendance), path('me/fees/', api.my_fees),
    path('notices/', api.notices), path('me/admit-card/', api.my_admit_card),
    path('admin/overview/', api.admin_overview), path('admin/registrations/', api.admin_registrations),
    path('admin/registrations/<int:pk>/decide/', api.admin_decision), path('admin/students/', api.admin_students),
    path('admin/results/', api.admin_results), path('admin/results/<int:pk>/publish/', api.admin_publish_result),
    path('admin/setup/', api.admin_setup), path('admin/offerings/', api.admin_offerings), path('admin/attendance/', api.admin_attendance),
    path('admin/invoices/', api.admin_invoices), path('admin/payments/', api.admin_payments), path('admin/notices/', api.admin_notices), path('admin/audit/', api.admin_audit),
]
