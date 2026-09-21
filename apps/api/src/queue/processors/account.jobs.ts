export const AccountJobName = {
  DELETE_ACCOUNT: 'delete_account',
  EXPORT_DATA: 'export_data',
} as const;

export type DeleteAccountJobData = { userId: string };
export type ExportDataJobData = { userId: string; jobId: string };
