from django.core.exceptions import ValidationError
from django.db.models.signals import m2m_changed, pre_delete
from django.dispatch import receiver
from .models import Requirement, Student


@receiver(m2m_changed, sender=Requirement.courses.through)
def freeze_assigned_requirement_courses(sender, instance, action, reverse, pk_set, **kwargs):
    if action not in ['pre_add', 'pre_remove', 'pre_clear']:
        return
    if action != 'pre_clear' and not pk_set:
        return
    requirements = (Requirement.objects.filter(pk__in=pk_set) if pk_set is not None else instance.requirements.all()) if reverse else Requirement.objects.filter(pk=instance.pk)
    if Student.objects.filter(curriculum_id__in=requirements.values('curriculum_id')).exists():
        raise ValidationError('Assigned curriculum mappings are immutable. Create a new curriculum version instead.')


@receiver(pre_delete, sender=Requirement)
def prevent_assigned_requirement_deletion(sender, instance, **kwargs):
    if Student.objects.filter(curriculum_id=instance.curriculum_id).exists():
        raise ValidationError('Assigned curriculum requirements cannot be deleted.')
