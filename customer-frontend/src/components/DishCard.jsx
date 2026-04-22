import React from 'react';
import { ShoppingCart, Star } from 'lucide-react';

export default function DishCard({ dish, onOrder, isAdmin }) {
  return (
    <div className="group bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1">
      <div className="aspect-video bg-gradient-to-tr from-slate-100 to-slate-200 relative overflow-hidden">
        {/* Placeholder para imagen, en un caso real se usa dish.imageUrl */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl">🥘</span>
        </div>
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-sm font-bold shadow-sm flex items-center gap-1 text-slate-800">
          <Star size={14} className="text-amber-400 fill-amber-400" />
          {dish.rating || '4.5'}
        </div>
      </div>
      
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2 gap-2">
          <h3 className="font-bold text-lg text-slate-800 line-clamp-2">{dish.name}</h3>
          <span className="font-bold text-lg text-brand-600 shrink-0">${dish.price}</span>
        </div>
        
        <p className="text-sm text-slate-500 mb-4 line-clamp-3">
          {dish.description || 'Delicioso platillo preparado con los más finos ingredientes. Perfecto para tu antojo.'}
        </p>
        
        <div className="mt-auto flex gap-2">
          {!isAdmin && (
            <button 
              onClick={() => onOrder && onOrder(dish)}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2.5 font-medium transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingCart size={16} /> Agregar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
