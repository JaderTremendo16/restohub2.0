import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { 
  GET_ALL_RATINGS, 
  GET_RATING_FOR_DISH, 
  CREATE_RATING_MUTATION, 
  UPDATE_RATING_MUTATION, 
  DELETE_RATING_MUTATION 
} from '../../graphql/operations';
import { useAuth } from '../../context/AuthContext';
import { Star, X, Pencil, Trash2, Send, CheckCircle2 } from 'lucide-react';

const RatingModal = ({ dishName, onClose }) => {
  const { user } = useAuth();
  const [selectedStars, setSelectedStars] = useState(0);
  const [comment, setComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const { data: allData, loading: loadingAll, refetch: refetchAll } = useQuery(GET_ALL_RATINGS);
  const { data: myData, loading: loadingMy, refetch: refetchMy } = useQuery(GET_RATING_FOR_DISH, {
    variables: { cid: user.id, itemName: dishName },
    skip: !user
  });

  const [createRating] = useMutation(CREATE_RATING_MUTATION, {
    refetchQueries: ['GetAllRatings']
  });
  const [updateRating] = useMutation(UPDATE_RATING_MUTATION, {
    refetchQueries: ['GetAllRatings']
  });
  const [deleteRating] = useMutation(DELETE_RATING_MUTATION, {
    refetchQueries: ['GetAllRatings']
  });

  const myReview = myData?.ratingForDish;
  const communityReviews = allData?.allRatings?.filter(r => r.itemName === dishName) || [];

  useEffect(() => {
    if (myReview) {
      setSelectedStars(myReview.stars);
      setComment(myReview.comment || '');
    }
  }, [myReview]);

  const handleSubmit = async () => {
    if (selectedStars === 0) {
      setMsg({ type: 'error', text: 'Por favor selecciona una calificación.' });
      return;
    }

    try {
      if (myReview) {
        await updateRating({
          variables: { id: myReview.id, stars: selectedStars, comment }
        });
      } else {
        await createRating({
          variables: { cid: user.id, item: dishName, stars: selectedStars, comment }
        });
      }
      setMsg({ type: 'success', text: '¡Reseña guardada con éxito!' });
      setIsEditing(false);
      refetchAll();
      refetchMy();
      setTimeout(() => setMsg({ type: '', text: '' }), 3000);
    } catch (error) {
      setMsg({ type: 'error', text: error.message });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar tu reseña?')) return;
    try {
      await deleteRating({ variables: { id: myReview.id } });
      setSelectedStars(0);
      setComment('');
      refetchAll();
      refetchMy();
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        {/* Left Side: Community Reviews */}
        <div className="flex-1 p-8 overflow-y-auto border-b md:border-b-0 md:border-r border-slate-100">
          <h4 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
            Opiniones de la comunidad
          </h4>
          
          {loadingAll ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : communityReviews.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-slate-400 italic">Aún no hay reseñas para este plato. ¡Sé el primero!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {communityReviews.map((r) => (
                <div key={r.id} className={`p-4 rounded-2xl ${r.customerId === user.id ? 'bg-brand-50 border-2 border-brand-100' : 'bg-slate-50'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} fill={i < r.stars ? "currentColor" : "none"} strokeWidth={i < r.stars ? 0 : 2} />
                      ))}
                    </div>
                    <span className="text-[10px] uppercase font-black text-slate-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{r.comment || 'Sin comentario'}</p>
                  {r.customerId === user.id && (
                    <span className="mt-2 inline-block text-[9px] font-black uppercase text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full">
                      Tu reseña
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: My Review Form */}
        <div className="w-full md:w-[350px] p-8 bg-slate-50/50 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h5 className="font-black text-slate-900 uppercase tracking-widest text-xs">Tu Opinión</h5>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            {msg.text && (
              <div className={`mb-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {msg.type === 'success' ? <CheckCircle2 size={14} /> : <X size={14} />}
                {msg.text}
              </div>
            )}

            {myReview && !isEditing ? (
              <div className="space-y-4 text-center">
                <div className="flex justify-center text-amber-400 mb-2">
                   {[...Array(5)].map((_, i) => (
                    <Star key={i} size={24} fill={i < myReview.stars ? "currentColor" : "none"} />
                  ))}
                </div>
                <p className="text-slate-600 italic text-sm">"{myReview.comment || 'Sin comentario'}"</p>
                <div className="flex gap-2 pt-4">
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="flex-1 py-2 rounded-xl border-2 border-slate-100 font-black text-xs text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2"
                  >
                    <Pencil size={14} /> Editar
                  </button>
                  <button 
                    onClick={handleDelete}
                    className="p-2 rounded-xl border-2 border-rose-50 text-rose-500 hover:bg-rose-50"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 text-center">Calificación</label>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button 
                        key={s} 
                        onClick={() => setSelectedStars(s)}
                        className={`transition-all ${selectedStars >= s ? 'text-amber-400 scale-125' : 'text-slate-200 hover:text-amber-200'}`}
                      >
                        <Star size={32} fill={selectedStars >= s ? "currentColor" : "none"} strokeWidth={2} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Comentario</label>
                  <textarea 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="¿Qué te pareció este plato?"
                    className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-brand-500 focus:bg-white rounded-2xl text-sm transition-all resize-none outline-none h-32"
                  />
                </div>

                <button 
                  onClick={handleSubmit}
                  className="w-full py-4 bg-brand-orange text-white rounded-2xl font-black text-sm shadow-lg shadow-brand-orange/20 hover:bg-brand-700 transition-all flex items-center justify-center gap-2"
                >
                  <Send size={16} /> {myReview ? 'Guardar Cambios' : 'Enviar Reseña'}
                </button>
                
                {isEditing && (
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="w-full text-slate-400 text-xs font-bold hover:text-slate-600"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;
