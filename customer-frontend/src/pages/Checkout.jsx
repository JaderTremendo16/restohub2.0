import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { 
  GET_CART, 
  COMPLETE_ORDER_MUTATION,
  CREATE_REAL_ORDER,
  ADD_ORDER_ITEMS,
  UPDATE_PROFILE_MUTATION,
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

const Checkout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState(null); // 'cash' | 'paypal'
  const [cashAmount, setCashAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddressMap, setShowAddressMap] = useState(false);
  const [isOutOfRange, setIsOutOfRange] = useState(false);

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

  const { data: locationsData } = useQuery(GET_LOCATIONS);
  const locations = locationsData?.locations || [];
  const branchLocation = locations.find(l => l.name === user?.branch);

  const [updateProfile] = useMutation(UPDATE_PROFILE_MUTATION);
  const [completeOrder] = useMutation(COMPLETE_ORDER_MUTATION);

  // --- LÓGICA COMENTADA PARA EL COMPAÑERO ---
  /*
  const [createRealOrder] = useMutation(CREATE_REAL_ORDER);
  const [addOrderItems] = useMutation(ADD_ORDER_ITEMS);
  const [redeemPoints] = useMutation(REDEEM_POINTS_MUTATION); // Solo si se activa el descuento de puntos aquí
  */

  const items = data?.cart?.items || [];
  const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const change = cashAmount ? parseFloat(cashAmount) - total : 0;

  const handleConfirmOrder = async () => {
    if (!paymentMethod) {
      alert("Por favor selecciona un método de pago.");
      return;
    }
    
    setIsProcessing(true);
    try {
      // 1. REGISTRO EN EL HISTORIAL (CUSTOMER-SERVICE)
      // Esta mutación ya limpia el carrito en Redis
      await completeOrder({
        variables: {
          cid: user.id,
          items: JSON.stringify(items.map(i => ({ name: i.name, price: i.price, qty: i.quantity }))),
          total: total,
          branch: user.branch || "General"
        },
        refetchQueries: [{ query: GET_CART, variables: { customerId: user.id } }]
      });

      // --- LÓGICA PARA EL COMPAÑERO (INTEGRACIÓN CON ORDERS-SERVICE) ---
      /* 
      TODO: Implementar la creación de la orden real en el microservicio de órdenes.
      
      const { data: orderData } = await createRealOrder({
        variables: {
          restaurant_id: user.branch_id || "1", // Necesitarás el ID real de la sede
          customer_id: user.id,
          channel: "web",
          priority: "normal"
        }
      });
      
      const orderId = orderData.createOrder.id;
      
      await addOrderItems({
        variables: {
          order_id: orderId,
          items: items.map(i => ({
            product_id: i.productId,
            product_name: i.name,
            quantity: i.quantity,
            unit_price: i.price,
            notes: i.isReward ? "Canje de premio" : ""
          }))
        }
      });
      
      // TODO: Si hay premios, descontar los puntos aquí si no se hizo antes
      const rewardItems = items.filter(i => i.isReward);
      for (const reward of rewardItems) {
        // await redeemPoints({ variables: { ... } });
      }
      */

      navigate('/history');
    } catch (err) {
      alert("Error al procesar el pedido: " + err.message);
    } finally {
      setIsProcessing(false);
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
                    branchLocation={branchLocation}
                    onValidationChange={setIsOutOfRange}
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
                    {item.price === 0 ? "GRATIS" : `$${(item.price * item.quantity).toLocaleString()}`}
                  </span>
                </div>
              ))}
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-lg font-black uppercase italic text-slate-800">Total</span>
                <span className="text-2xl font-black text-brand-orange">${total.toLocaleString()}</span>
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

            {/* PayPal Placeholder */}
            {paymentMethod === 'paypal' && (
              <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-4 animate-in slide-in-from-top-4 text-center">
                <div className="py-8 border-2 border-dashed border-white/20 rounded-2xl text-slate-500 font-black uppercase text-[10px] tracking-widest">
                  [ Botón PayPal SDK Placeholder ]
                </div>
                <p className="text-[10px] text-slate-500 font-medium italic">
                  * Serás redirigido a la plataforma segura de PayPal.
                </p>
              </div>
            )}

            <button
              onClick={handleConfirmOrder}
              disabled={isProcessing || !paymentMethod || (paymentMethod === 'cash' && (!cashAmount || parseFloat(cashAmount) < total)) || isOutOfRange}
              className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20"
            >
              {isProcessing ? (
                <Loader2 className="animate-spin" size={24} />
              ) : isOutOfRange ? (
                "UBICACIÓN FUERA DE COBERTURA"
              ) : (
                <><CheckCircle2 size={24} /> Confirmar Pedido</>
              )}
            </button>
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
