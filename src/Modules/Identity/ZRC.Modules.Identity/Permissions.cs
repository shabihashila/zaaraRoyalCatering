namespace ZRC.Modules.Identity;

public static class IdentityPermissions
{
    public const string UserView = "identity.user.view";
    public const string UserManage = "identity.user.manage";
    public const string RoleView = "identity.role.view";
    public const string RoleManage = "identity.role.manage";
    public const string AuditView = "identity.audit.view";

    public static readonly string[] All = [UserView, UserManage, RoleView, RoleManage, AuditView];
}
