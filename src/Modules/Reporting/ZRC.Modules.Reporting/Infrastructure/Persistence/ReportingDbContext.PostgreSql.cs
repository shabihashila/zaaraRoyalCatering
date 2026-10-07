using Microsoft.EntityFrameworkCore;
using ZRC.Infrastructure.Common;
namespace Reporting.Infrastructure.Persistence;
public partial class ReportingDbContext
{
    partial void OnModelCreatingPartial(ModelBuilder modelBuilder) => DatabaseProvider.AdaptPostgres(modelBuilder, this);
}
