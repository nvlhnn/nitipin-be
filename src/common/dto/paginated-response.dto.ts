import { PaginationMeta } from '../interceptors/response.interceptor.js';

export class PaginatedResponseDto<T> {
  success: boolean = true;
  data: T[];
  meta: PaginationMeta;

  constructor(data: T[], total: number, page: number, perPage: number) {
    this.data = data;
    this.meta = {
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage),
    };
  }
}
