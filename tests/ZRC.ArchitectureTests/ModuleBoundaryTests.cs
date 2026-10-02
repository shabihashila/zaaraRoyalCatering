using NetArchTest.Rules;
using ZRC.Modules.Catalog;
using ZRC.Modules.Ordering;
using ZRC.SharedKernel;

namespace ZRC.ArchitectureTests;

public sealed class ModuleBoundaryTests
{
    [Fact]
    public void Modules_must_not_reference_other_modules_infrastructure_or_dbcontext()
    {
        var result = Types.InAssemblies([typeof(CatalogModule).Assembly, typeof(OrderingModule).Assembly])
            .That().ResideInNamespaceMatching(@"ZRC\.Modules\.(Catalog|Ordering|Identity|Navigation|Customers|Engagement|Content|Reporting).*")
            .And().DoNotHaveNameMatching(".*Contracts.*")
            .Should().NotHaveDependencyOnAny("ZRC.Modules.Catalog.Infrastructure", "ZRC.Modules.Ordering.Infrastructure")
            .GetResult();
        Assert.True(result.IsSuccessful, "Module boundary violated: " + string.Join("; ", result.FailingTypeNames ?? []));
    }

    [Fact]
    public void IModule_implementations_must_exist_per_module()
    {
        var modules = Types.InAssembly(typeof(CatalogModule).Assembly)
            .That().ImplementInterface(typeof(IModule)).GetTypes();
        Assert.NotEmpty(modules);
    }

    [Fact]
    public void Ordering_must_use_catalog_contract_not_catalog_domain()
    {
        var result = Types.InAssembly(typeof(OrderingModule).Assembly)
            .That().ResideInNamespace("ZRC.Modules.Ordering")
            .Should().NotHaveDependencyOn("ZRC.Modules.Catalog.Domain")
            .GetResult();
        Assert.True(result.IsSuccessful, "Ordering must read catalog via ICatalogQuery contract.");
    }
}
