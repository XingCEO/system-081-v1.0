import { useSearchParams } from 'react-router-dom';
import OrderingFlow from '../../components/shared/OrderingFlow';

export default function QrPage() {
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get('table');

  if (!tableNumber) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center px-4">
        <div className="panel max-w-xl p-8 text-center">
          <h1 className="text-3xl font-black text-slate-900">找不到桌號</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            請重新掃描桌上 QR Code，系統會自動帶入桌號並進入加點流程。
          </p>
        </div>
      </div>
    );
  }

  return <OrderingFlow mode="qr" tableNumber={tableNumber} />;
}
