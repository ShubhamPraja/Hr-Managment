const pad2 = (value: number) => String(value).padStart(2, '0');

export const toDateKey = (value: Date) =>
  `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;

export const toMonthKey = (value: Date) =>
  `${value.getFullYear()}-${pad2(value.getMonth() + 1)}`;

export const toMonthLabel = (value: Date) =>
  value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export const daysBetween = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diff = Math.floor((end.getTime() - start.getTime()) / 86400000);
  return Math.max(0, diff + 1);
};

