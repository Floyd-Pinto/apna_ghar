"""
Who may see / change what. One place for the rules:

* Admin (is_staff): everything.
* Builder: full control of *their own* projects, units, milestones, QR codes and uploads only.
* Buyer: public project info, plus the private side of the units they bought
  (QR code, unit photos/videos, unit documents and progress records).
* Everyone: public project listings and available units (without private fields).
"""


def is_admin(user) -> bool:
    return bool(user and user.is_authenticated and user.is_staff)


def get_developer(user):
    if not (user and user.is_authenticated):
        return None
    return getattr(user, 'developer_profile', None)


def project_of(obj):
    """Return the Project an object belongs to (Project itself, or obj.project)."""
    from .models import Project
    if isinstance(obj, Project):
        return obj
    return getattr(obj, 'project', None)


def manages_project(user, project) -> bool:
    if project is None:
        return False
    if is_admin(user):
        return True
    developer = get_developer(user)
    return developer is not None and project.developer_id == developer.id


def owns_unit(user, prop) -> bool:
    return bool(user and user.is_authenticated and prop.buyer_id == user.id)


def can_view_unit_private(user, prop) -> bool:
    """QR code, unit photos/videos, unit documents: buyer of the unit, its builder, or an admin."""
    return owns_unit(user, prop) or manages_project(user, prop.project)


def request_user(context):
    request = (context or {}).get('request')
    return getattr(request, 'user', None)
