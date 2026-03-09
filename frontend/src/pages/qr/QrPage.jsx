import { useSearchParams } from 'react-router-dom';
import OrderingFlow from '../../components/shared/OrderingFlow';

export default function QrPage() {
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get('table');

  if (!tableNumber) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center px-4">
        <div className="panel max-w-xl p-8 text-center">
          <h1 className="text-3xl font-black text-slate-900">桌號資訊不存在</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            請重新掃描桌上的 QR Code。若仍無法進入，請聯繫櫃台協助確認桌號與網址設定。
          </p>
        </div>
      </div>
    );
  }

  return <OrderingFlow mode="qr" tableNumber={tableNumber} />;
}
