import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { 
  GET_CART, 
  COMPLETE_ORDER_MUTATION,
  CAPTURE_PAYPAL_ORDER,
  REDEEM_POINTS_MUTATION
} from '../graphql/operations';
import { useAuth } from '../context/AuthContext';
import MapPicker from '../components/common/MapPicker';
import { 
  CreditCard, 
  Banknote, 
  ArrowLeft, 
  MapPin, 
  Calculator,
  Loader2,
  AlertCircle,
  Gift,
  Sparkles
} from 'lucide-react';

const Checkout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [cashAmount, setCashAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddressMap, setShowAddressMap] = useState(false);

  const [deliveryLocation, setDeliveryLocation] = useState({
    address: user?.address || '',
    lat: user?.latitude || null,
    lng: user?.longitude || null,
    city: user?.city || '',
    country: user?.country || ''
  });

  const { data, loading } = useQuery(GET_CART, {
    variables: { customerId: user?.id },
    skip: !user
  });

  const [capturePaypalOrder] = useMutation(CAPTURE_PAYPAL_ORDER);
  const [redeemPoints] = useMutation(REDEEM_POINTS_MUTATION);

  const items = data?.cart?.items || [];
  const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const isFreeOrder = total === 0 && items.length > 0;

  const processRewards = async () => {
    console.log("[Checkout] Procesando premios...");
    for (const item of items) {
      if (item.isReward && item.productId?.startsWith('reward-')) {
        const rewardId = item.productId.replace('reward-', '');
        const quantity = item.quantity || 1;
        for (let i = 0; i < quantity; i++) {
          try {
            await redeemPoints({ variables: { cid: user?.id, rid: rewardId } });
          } catch (err) {
            console.error(err);
          }
        }
      }
    }
  };

  const handlePaypalSuccess = async (details) => {
    try {
      await capturePaypalOrder({
        variables: {
          paypalOrderId: details.id,
          cid: user?.id,
          rid: user?.branch || "1",
          itemsJson: JSON.stringify(items.map(i => ({ product_id: i.productId, name: i.name, price: i.price, quantity: i.quantity }))),
          total: total
        }
      });
      await processRewards();
      alert("¡Pedido realizado con éxito! 💳");
      navigate('/history');
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleFreeOrder = async () => {
    setIsProcessing(true);
    try {
      await capturePaypalOrder({
        variables: {
          paypalOrderId: "FREE_" + Date.now(),
          cid: user?.id,
          rid: user?.branch || "1",
          itemsJson: JSON.stringify(items.map(i => ({ product_id: i.productId, name: i.name, price: 0, quantity: i.quantity }))),
          total: 0
        }
      });
      await processRewards();
      alert("¡Pedido realizado con éxito! 🎁");
      navigate('/history');
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmOrder = async (isCash = false) => {
    if (!paymentMethod && !isCash) {
      alert("Selecciona método de pago.");
      return;
    }
    setIsProcessing(true);
    try {
      await capturePaypalOrder({
        variables: {
          paypalOrderId: (isCash ? "CASH_" : "OTHER_") + Date.now(),
          cid: user?.id,
          rid: user?.branch || "1",
          itemsJson: JSON.stringify(items.map(i => ({ product_id: i.productId, name: i.name, price: i.price, quantity: i.quantity }))),
          total: total
        }
      });
      await processRewards();
      alert("Pedido confirmado.");
      navigate('/history');
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/cart')} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all text-slate-400">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-3xl font-black text-slate-800 uppercase italic">Finalizar Pedido</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h2 className="text-xl font-black mb-6 flex items-center gap-3"><MapPin className="text-brand-orange" /> Dirección de Entrega</h2>
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
              <p className="font-bold text-slate-700">{deliveryLocation.address || 'No definida'}</p>
              <button onClick={() => setShowAddressMap(true)} className="mt-4 text-xs font-black text-brand-orange uppercase">Cambiar dirección</button>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h2 className="text-xl font-black mb-6 flex items-center gap-3"><CreditCard className="text-brand-orange" /> Método de Pago</h2>
            {isFreeOrder ? (
              <div className="p-8 bg-emerald-50 border-2 border-emerald-100 rounded-3xl flex items-center gap-6">
                <Gift size={48} className="text-emerald-500" />
                <div>
                  <h4 className="text-lg font-black text-emerald-800">Pedido 100% Gratuito</h4>
                  <p className="text-emerald-600 font-medium">Solo canje de premios. No se requiere pago adicional.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setPaymentMethod('paypal')} className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${paymentMethod === 'paypal' ? 'border-brand-orange bg-brand-orange/5' : 'border-slate-100 hover:border-slate-200'}`}>
                  <CreditCard className={paymentMethod === 'paypal' ? 'text-brand-orange' : 'text-slate-400'} size={32} />
                  <span className="font-black text-xs uppercase">PayPal / Tarjeta</span>
                </button>
                <button onClick={() => setPaymentMethod('cash')} className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${paymentMethod === 'cash' ? 'border-brand-orange bg-brand-orange/5' : 'border-slate-100 hover:border-slate-200'}`}>
                  <Banknote className={paymentMethod === 'cash' ? 'text-brand-orange' : 'text-slate-400'} size={32} />
                  <span className="font-black text-xs uppercase">Efectivo</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-brand-dark p-8 rounded-[2.5rem] text-white h-fit sticky top-24 shadow-2xl">
          <h3 className="text-xl font-black italic uppercase mb-6">Total a Pagar</h3>
          <div className="text-4xl font-black text-brand-orange mb-8">${total.toLocaleString()}</div>
          {isFreeOrder ? (
            <button onClick={handleFreeOrder} disabled={isProcessing} className="w-full py-5 bg-brand-orange rounded-2xl font-black uppercase text-sm shadow-xl shadow-brand-orange/20 hover:scale-105 transition-all">Confirmar Canje 🎁</button>
          ) : paymentMethod === 'cash' ? (
            <button onClick={() => handleConfirmOrder(true)} disabled={isProcessing} className="w-full py-5 bg-emerald-500 rounded-2xl font-black uppercase text-sm shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all">Confirmar Pedido 💵</button>
          ) : paymentMethod === 'paypal' ? (
            <PayPalScriptProvider options={{ "client-id": "test" }}>
              <PayPalButtons 
                style={{ layout: "vertical" }} 
                createOrder={(data, actions) => {
                  return actions.order.create({
                    purchase_units: [{
                      amount: { value: total.toFixed(2) }
                    }]
                  });
                }}
                onApprove={async (data, actions) => {
                  const details = await actions.order.capture();
                  await handlePaypalSuccess(details);
                }} 
              />
            </PayPalScriptProvider>
          ) : (
            <div className="p-4 bg-white/5 rounded-2xl text-center text-xs font-bold text-white/50 uppercase">Selecciona un método</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Checkout;
