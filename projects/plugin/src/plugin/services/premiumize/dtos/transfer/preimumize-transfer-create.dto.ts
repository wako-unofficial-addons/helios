export interface PreimumizeTransferCreateDto {
  status: 'success' | 'error';
  id?: string;
  name?: string;
  type?: string;
  message?: string;
}
