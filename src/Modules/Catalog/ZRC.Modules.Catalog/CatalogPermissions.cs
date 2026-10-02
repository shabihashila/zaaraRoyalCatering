using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ZRC.SharedKernel;

namespace ZRC.Modules.Catalog;

public static class CatalogPermissions
{
    public const string CategoryView = "catalog.category.view";
    public const string CategoryEdit = "catalog.category.edit";
    public const string PackageView = "catalog.package.view";
    public const string PackageEdit = "catalog.package.edit";
    public const string CostingView = "catalog.costing.view";

    public static readonly string[] All = [CategoryView, CategoryEdit, PackageView, PackageEdit, CostingView];
}
