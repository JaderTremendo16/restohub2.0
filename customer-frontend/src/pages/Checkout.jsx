import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { 
  GET_CART, 
  COMPLETE_ORDER_MUTATION,
  CREATE_REAL_ORDER,
  ADD_ORDER_ITEMS,
  UPDATE_PROFILE_MUTATION,
  REDEEM_POINTS_MUTATION,
  GENERATE_INVOICE_MUTATION,
  CREATE_PAYMENT_MUTATION,
  GET_LOCATIONS
} from '../graphql/operations';
import { useAuth } from '../context/AuthContext';
import MapPicker from '../components/common/MapPicker';
import { 
  CreditCard, 
  Banknote, 
  ArrowLeft, 
  CheckCircle2, 
  MapPin, 
  Calculator,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { PayPalButtons } from "@paypal/react-paypal-js";

const Checkout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState(null); // 'cash' | 'paypal'
  const [cashAmount, setCashAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddressMap, setShowAddressMap] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const [deliveryLocation, setDeliveryLocation] = useState({
    address: user?.address || '',
    lat: user?.latitude || null,
    lng: user?.longitude || null,
    city: user?.city || '',
    country: user?.country || ''
  });

  const { data, loading } = useQuery(GET_CART, {
    variables: { customerId: user.id },
    skip: !user
  });

  const [updateProfile] = useMutation(UPDATE_PROFILE_MUTATION);
  const [completeOrder] = useMutation(COMPLETE_ORDER_MUTATION);

  const [createRealOrder] = useMutation(CREATE_REAL_ORDER);
  const [addOrderItems] = useMutation(ADD_ORDER_ITEMS);
  const [redeemPoints] = useMutation(REDEEM_POINTS_MUTATION);
  const [generateInvoice] = useMutation(GENERATE_INVOICE_MUTATION);
  const [createPayment] = useMutation(CREATE_PAYMENT_MUTATION);
  const { data: locData } = useQuery(GET_LOCATIONS);

  const items = data?.cart?.items || [];
  const total = items.reduce((acc, item) => {
    let itemPrice = Number(item.price);
    // Normalización de emergencia para precios gigantes
    if (itemPrice > 10000) itemPrice = itemPrice / 1000;
    return acc + (itemPrice * item.quantity);
  }, 0);
  const change = cashAmount ? parseFloat(cashAmount) - total : 0;

  const processOrder = async (paypalData = null) => {
    if (!user) return alert("Inicia sesión primero");
    
    // Si no hay ítems, no procesar
    if (items.length === 0) {
        alert("El carrito está vacío");
        return;
    }
    
    // Evitar doble proceso
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const locations = locData?.locations || [];
      const currentLocation = locations.find(loc => 
        loc.name?.trim().toLowerCase() === user.branch?.trim().toLowerCase()
      );
      const branchId = currentLocation ? currentLocation.id : (user.branch || "General");

      // 1. Crear la orden real para Cocina (orders-service)
      const { data: orderData } = await createRealOrder({
        variables: {
          restaurant_id: branchId,
          customer_id: user.id,
          channel: "web",
          priority: "normal",
          notes: paypalData ? `Pagado via PayPal (${paypalData.id})` : `Pago en efectivo (Cambio: $${change})`
        }
      });

      const realOrderId = orderData.createOrder.id;

      // 2. Agregar los items a la orden de cocina
      await addOrderItems({
        variables: {
          order_id: realOrderId,
          items: items.map(i => {
            let p = parseFloat(i.price);
            if (p > 10000) p = p / 1000;
            return {
              product_id: i.productId,
              product_name: i.name,
              quantity: i.quantity,
              unit_price: p,
              notes: i.isReward ? "PREMIO CANJEADO" : ""
            };
          })
        }
      });

      // 3. Generar Factura y Registrar Pago para activar PUNTOS
      // Solo si es PayPal o si quieres que el efectivo sume puntos de una (asumimos pago exitoso)
      await generateInvoice({
        variables: {
          order_id: realOrderId,
          customer_name: user.name,
          customer_email: user.email
        }
      });

      await createPayment({
        variables: {
          order_id: realOrderId,
          method: paypalData ? "paypal" : "cash",
          amount: total
        }
      });

      // 4. Registrar en el historial (customer-service) y limpiar carrito
      await completeOrder({
        variables: {
          cid: user.id,
          items: JSON.stringify(items.map(i => ({ name: i.name, price: i.price, qty: i.quantity }))),
          total: total,
          branch: user.branch || "General",
          orderId: realOrderId
        }
      });

      // 5. Procesar canje de puntos si hay recompensas
      for (const item of items) {
        if (item.isReward) {
          const rewardId = item.productId.replace('reward-', '');
          await redeemPoints({
            variables: { cid: user.id, rid: rewardId }
          });
        }
      }

      setIsPaid(true);
      setTimeout(() => navigate('/history'), 2000);
    } catch (err) {
      console.error(err);
      alert("Error al procesar la orden: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmOrder = () => {
    if (!paymentMethod) {
      alert("Por favor selecciona un método de pago.");
      return;
    }
    if (paymentMethod === 'cash') {
      processOrder();
    }
  };

  const getCountryCenter = (country) => {
    const centers = {
      'Colombia': [4.6097, -74.0817],
      'Portugal': [38.7223, -9.1393],
      'España': [40.4168, -3.7038],
      'México': [19.4326, -99.1332]
    };
    return centers[country] || [4.6097, -74.0817];
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-orange" size={48} /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <button 
        onClick={() => navigate('/cart')}
        className="flex items-center gap-2 text-slate-400 font-black text-sm uppercase hover:text-brand-orange transition-all"
      >
        <ArrowLeft size={16} /> Volver al carrito
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Column: Order Summary & Address */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-xl font-black text-slate-800 uppercase italic flex items-center gap-3">
              <MapPin className="text-brand-orange" size={24} /> Entrega en:
            </h3>
            
            <div className="space-y-4">
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <p className="text-sm font-bold text-slate-800">{deliveryLocation.address || "No has definido una dirección"}</p>
                <p className="text-xs text-slate-400 mt-1">{deliveryLocation.city || "Sin ciudad"}, {deliveryLocation.country || "Sin país"}</p>
              </div>
              
              <button 
                onClick={() => setShowAddressMap(!showAddressMap)}
                className="text-brand-orange text-xs font-black uppercase tracking-widest hover:underline"
              >
                {showAddressMap ? "Cerrar Mapa" : "Ver / Cambiar Ubicación en Mapa"}
              </button>

              {showAddressMap && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <MapPicker 
                    lat={deliveryLocation.lat} 
                    lng={deliveryLocation.lng} 
                    address={deliveryLocation.address}
                    suggestedCenter={getCountryCenter(deliveryLocation.country)}
                    onChange={(lat, lng, address) => {
                      setDeliveryLocation(prev => ({
                        ...prev,
                        lat,
                        lng,
                        address: address || prev.address
                      }));
                    }}
                  />
                  <p className="mt-2 text-[10px] text-slate-400 font-medium italic">
                    * Esta dirección solo aplica para este pedido. Para cambiarla de forma permanente ve a tu Perfil.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-xl font-black text-slate-800 uppercase italic">Resumen de tu orden</h3>
            <div className="space-y-4">
              {items.map(item => (
                <div key={item.productId} className="flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-500">
                    {item.name} <span className="text-brand-orange">x{item.quantity}</span>
                  </span>
                  <span className="text-slate-800">
                    {item.price === 0 ? "GRATIS" : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.price * item.quantity)}
                  </span>
                </div>
              ))}
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-lg font-black uppercase italic text-slate-800">Total</span>
                <span className="text-2xl font-black text-brand-orange">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Payment & Confirm */}
        <div className="space-y-8">
          <div className="bg-brand-dark rounded-[2.5rem] p-8 text-white space-y-8 shadow-2xl shadow-black/20">
            <h3 className="text-2xl font-black italic uppercase tracking-tight">Método de Pago</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setPaymentMethod('cash')}
                className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${
                  paymentMethod === 'cash' ? 'border-brand-orange bg-brand-orange/10' : 'border-white/10 hover:border-white/20'
                }`}
              >
                <Banknote size={32} className={paymentMethod === 'cash' ? 'text-brand-orange' : 'text-slate-400'} />
                <span className="font-black text-xs uppercase tracking-widest">Efectivo</span>
              </button>
              
              <button 
                onClick={() => setPaymentMethod('paypal')}
                className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${
                  paymentMethod === 'paypal' ? 'border-brand-orange bg-brand-orange/10' : 'border-white/10 hover:border-white/20'
                }`}
              >
                <CreditCard size={32} className={paymentMethod === 'paypal' ? 'text-brand-orange' : 'text-slate-400'} />
                <span className="font-black text-xs uppercase tracking-widest">PayPal</span>
              </button>
            </div>

            {/* Cash Logic (Only if paymentMethod === 'cash') */}
            {paymentMethod === 'cash' && (
              <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-4 animate-in slide-in-from-top-4">
                <h4 className="text-sm font-black uppercase tracking-widest text-brand-orange flex items-center gap-2">
                  <Calculator size={16} /> Pago en Efectivo
                </h4>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase px-1">¿Con cuánto vas a pagar?</label>
                  <input 
                    type="number"
                    placeholder="$0.000"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="w-full bg-white/10 border-none rounded-2xl p-4 font-black text-white outline-none focus:ring-2 ring-brand-orange/50 transition-all"
                  />
                </div>
                {change > 0 ? (
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs font-bold text-slate-400">Tu vuelto:</span>
                    <span className="text-lg font-black text-emerald-400">${change.toLocaleString()}</span>
                  </div>
                ) : cashAmount && parseFloat(cashAmount) < total && (
                  <div className="flex items-center gap-2 text-rose-400 text-[10px] font-bold uppercase">
                    <AlertCircle size={12} /> El monto es insuficiente
                  </div>
                )}
              </div>
            )}

            {/* PayPal Integration */}
            {paymentMethod === 'paypal' && (
              <div className="space-y-4 animate-in slide-in-from-top-4">
                <PayPalButtons 
                  style={{ layout: "vertical", shape: "pill" }}
                  createOrder={(data, actions) => {
                    const finalTotal = parseFloat(total).toFixed(2);
                    console.log("Creando orden PayPal por:", finalTotal);
                    return actions.order.create({
                      intent: "CAPTURE",
                      purchase_units: [{
                        description: "Pedido RestoHub",
                        amount: {
                          currency_code: "USD",
                          value: finalTotal
                        }
                      }]
                    });
                  }}
                  onApprove={async (data, actions) => {
                    const details = await actions.order.capture();
                    processOrder(details);
                  }}
                  onError={(err) => {
                    console.error("DETALLE ERROR PAYPAL:", err);
                    alert("Hubo un error con la plataforma de PayPal. Revisa la consola para más detalles.");
                  }}
                />
                <p className="text-[10px] text-slate-500 font-medium italic text-center">
                  * Serás redirigido a la plataforma segura de PayPal.
                </p>
              </div>
            )}

            {isPaid ? (
              <div className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 animate-in zoom-in">
                <CheckCircle2 size={24} /> ¡Pago Recibido!
              </div>
            ) : paymentMethod === 'cash' ? (
              <button
                onClick={handleConfirmOrder}
                disabled={isProcessing || !paymentMethod || (paymentMethod === 'cash' && (!cashAmount || parseFloat(cashAmount) < total))}
                className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={24} /> : (
                  <><CheckCircle2 size={24} /> Confirmar Pedido</>
                )}
              </button>
            ) : paymentMethod === 'paypal' && (
              <div className="text-center py-4 bg-white/5 rounded-2xl border border-white/10 border-dashed">
                <p className="text-[10px] font-black uppercase tracking-tighter text-slate-500 italic">
                  Completa el pago arriba para finalizar
                </p>
              </div>
            )}
          </div>

          <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-[2.5rem] flex items-start gap-4">
            <AlertCircle className="text-blue-500 shrink-0" size={20} />
            <p className="text-[10px] text-blue-700 font-medium leading-relaxed">
              Al confirmar el pedido, aceptas que tu ubicación sea compartida con el repartidor para la entrega. 
              <span className="font-bold"> RestoHub</span> garantiza la frescura de tus platos desde nuestra sede hasta tu mesa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
