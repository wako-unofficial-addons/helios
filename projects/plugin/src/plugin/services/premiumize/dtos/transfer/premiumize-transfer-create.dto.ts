export interface PremiumizeTransferCreateDto {
  status: 'success' | 'error';
  id?: string;
  name?: string;
  type?: string;
  message?: string;
}
