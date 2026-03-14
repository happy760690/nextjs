import { fetchRevenue } from '@/app/lib/data';

export default async function Page() {
  const revenue = await fetchRevenue();

  return (
    <main>
      <h1 className="text-2xl font-bold mb-4">Revenue</h1>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-4 py-2 text-left">Month</th>
            <th className="border px-4 py-2 text-right">Revenue ($)</th>
          </tr>
        </thead>
        <tbody>
          {revenue.map((item) => (
            <tr key={item.month} className="hover:bg-gray-50">
              <td className="border px-4 py-2">{item.month}</td>
              <td className="border px-4 py-2 text-right">{item.revenue.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}