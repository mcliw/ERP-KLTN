from app.core.role.auth_context import build_auth_context

# thay user_id bằng UUID thật (string)
USER_ID = "829f90b9-d38e-4e2b-b96e-9eaae18981a8"

ctx = build_auth_context(user_id=USER_ID)
print("is_authenticated:", ctx.is_authenticated)
print("role:", ctx.role)
print("permissions_count:", len(ctx.permissions))
print("permissions_sample:", sorted(list(ctx.permissions))[:20])
