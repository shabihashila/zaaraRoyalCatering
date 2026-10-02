using System;
using System.Collections.Generic;

namespace Catalog.Domain.Entities.Generated;

public partial class PackageInclusion
{
    public Guid Id { get; set; }

    public Guid PackageId { get; set; }

    public string Text { get; set; } = null!;

    public int SortOrder { get; set; }

    public virtual Package Package { get; set; } = null!;
}
