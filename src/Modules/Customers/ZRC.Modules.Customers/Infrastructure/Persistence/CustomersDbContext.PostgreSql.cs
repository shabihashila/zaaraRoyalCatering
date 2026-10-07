using Microsoft.EntityFrameworkCore;
using ZRC.Infrastructure.Common;
namespace Customers.Infrastructure.Persistence;
public partial class CustomersDbContext
{
    partial void OnModelCreatingPartial(ModelBuilder modelBuilder) => DatabaseProvider.AdaptPostgres(modelBuilder, this);
}
