from django.contrib import admin
from . import models

# Operational updates use the audited API. Django admin is a read-only technical
# inspection surface, so staff cannot bypass publication/financial locking rules.
class ReadOnlyAdmin(admin.ModelAdmin):
    def has_add_permission(self, request): return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False

for model in [models.Curriculum, models.Course, models.Requirement, models.Student, models.Term, models.Offering, models.Registration,
              models.Result, models.Meeting, models.Attendance, models.Invoice, models.Payment, models.Notice, models.AdmitCard, models.AuditEvent]:
    admin.site.register(model, ReadOnlyAdmin)
admin.site.site_header = 'Campus · technical record inspection'
admin.site.site_title = 'Campus ERP'
