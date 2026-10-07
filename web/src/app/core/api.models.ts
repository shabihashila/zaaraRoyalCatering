export interface MenuItemDto {
  id: string;
  parentId: string | null;
  key: string;
  label: string;
  labelBn: string | null;
  icon: string | null;
  route: string | null;
  externalUrl: string | null;
  requiredPermission: string | null;
  menuArea: string;
  sortOrder: number;
  isVisible: boolean;
  rowVersion: string;
  children: MenuItemDto[];
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}
