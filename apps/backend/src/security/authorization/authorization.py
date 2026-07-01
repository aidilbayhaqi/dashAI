def has_permission(user, permission: str):

    if user.role == "superadmin":
        return True

    return permission in user.permissions