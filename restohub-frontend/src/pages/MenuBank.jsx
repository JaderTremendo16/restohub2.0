import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  GET_DISHES,
  CREATE_DISH,
  UPDATE_DISH,
  ACTIVATE_DISH,
  DEACTIVATE_DISH,
  ADD_DISH_INGREDIENT,
  REMOVE_DISH_INGREDIENT,
  UPDATE_DISH_INGREDIENT,
  GET_DISH_INGREDIENTS,
} from "../graphql/menu";
import { GET_INGREDIENTS, CREATE_INGREDIENT } from "../graphql/ingredients";
import { 
  Plus, 
  Search, 
  ChefHat, 
  Info, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Edit3,
  Scale,
  DollarSign,
  AlertTriangle,
  Power
} from "lucide-react";

// --- Design Tokens & Styling ---
const COLORS = {
  primary: "#ea580c",
  secondary: "#1a1a2e",
  success: "#16a34a",
  danger: "#dc2626",
  warning: "#f59e0b",
  bg: "#f8fafc",
  card: "#ffffff",
  text: "#334155",
  textMuted: "#64748b",
  border: "#e2e8f0"
};

const inputStyle = {
  width: "100%",
  padding: "0.75rem 1rem",
  border: `1.5px solid ${COLORS.border}`,
  borderRadius: "0.75rem",
  fontSize: "0.9rem",
  color: COLORS.secondary,
  outline: "none",
  backgroundColor: "white",
  transition: "all 0.2s",
  marginBottom: "0.5rem"
};

const labelStyle = {
  display: "block",
  fontSize: "0.8rem",
  fontWeight: "700",
  color: COLORS.text,
  marginBottom: "0.5rem",
  textTransform: "uppercase",
  letterSpacing: "0.025em"
};

const CATEGORIAS = ["entrada", "sopa", "principal", "postre", "bebida"];
const UNIDADES = ["kg", "g", "l", "ml", "unidad"];

const CATEGORIA_ESTILOS = {
  entrada: { bg: "#ffedd5", border: "#fdba74", text: "#9a3412" },
  sopa: { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534" },
  principal: { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
  postre: { bg: "#fdf2f8", border: "#fbcfe8", text: "#9d174d" },
  bebida: { bg: "#f0f9ff", border: "#bae6fd", text: "#075985" },
};

// --- Unit Conversion Utility ---
const convertToGlobalValue = (quantity, unit) => {
  const val = parseFloat(quantity);
  if (isNaN(val)) return 0;
  if (unit === "g" || unit === "ml") return val / 1000;
  return val;
};

// --- Sub-Component: Modal Create/Edit Dish ---
function DishEditorModal({ dish, onClose, onSaved }) {
  const [form, setForm] = useState(dish ? {
    name: dish.name,
    description: dish.description || "",
    category: dish.category
  } : {
    name: "",
    description: "",
    category: "principal"
  });

  const [saveDish, { loading }] = useMutation(dish ? UPDATE_DISH : CREATE_DISH, {
    refetchQueries: [{ query: GET_DISHES, variables: { onlyGlobal: true } }],
    onCompleted: (data) => onSaved(dish ? data.updateDish : data.createDish),
    onError: (e) => alert("Error: " + e.message)
  });

  const handleSave = () => {
    if (!form.name.trim()) return alert("El nombre es obligatorio");
    const input = { ...form, location_id: null }; // Ensure it's global
    if (dish) {
      saveDish({ variables: { id: dish.id, input } });
    } else {
      saveDish({ variables: { input } });
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
      <div style={{ backgroundColor: "white", padding: "2rem", borderRadius: "1.5rem", width: "100%", maxWidth: "500px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <ChefHat color={COLORS.primary} size={28} />
          <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "800", color: COLORS.secondary }}>
            {dish ? "Editar Plato Maestro" : "Nuevo Plato Maestro"}
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={labelStyle}>Nombre del Plato</label>
            <input 
              value={form.name} 
              onChange={e => setForm({...form, name: e.target.value})}
              placeholder="Ej: Burger Master Classic"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = COLORS.primary}
              onBlur={e => e.target.style.borderColor = COLORS.border}
            />
          </div>
          <div>
            <label style={labelStyle}>Categoría</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {CATEGORIAS.map(cat => (
                <button
                  key={cat}
                  onClick={() => setForm({...form, category: cat})}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "2rem",
                    fontSize: "0.8rem",
                    fontWeight: "700",
                    border: `2px solid ${form.category === cat ? COLORS.primary : COLORS.border}`,
                    backgroundColor: form.category === cat ? COLORS.primary : "white",
                    color: form.category === cat ? "white" : COLORS.textMuted,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    textTransform: "capitalize"
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Descripción / Nota Receta</label>
            <textarea 
              value={form.description} 
              onChange={e => setForm({...form, description: e.target.value})}
              placeholder="Detalla cómo debe verse o servirse el plato..."
              rows={3}
              style={{ ...inputStyle, resize: "none" }}
              onFocus={e => e.target.style.borderColor = COLORS.primary}
              onBlur={e => e.target.style.borderColor = COLORS.border}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "0.875rem", borderRadius: "0.75rem", border: `1.5px solid ${COLORS.border}`, backgroundColor: "white", color: COLORS.text, fontWeight: "700", cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={loading} style={{ flex: 2, padding: "0.875rem", borderRadius: "0.75rem", border: "none", backgroundColor: COLORS.primary, color: "white", fontWeight: "700", cursor: "pointer", boxShadow: "0 10px 15px -3px rgba(234, 88, 12, 0.3)" }}>
            {loading ? "Guardando..." : (dish ? "Actualizar Maestro" : "Crear en el Banco")}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Sub-Component: Recipe Editor (Ingredients & Grammage) ---
function RecipeEditor({ dish, onClose, ingredients, refetchIngredients }) {
  const [ingForm, setIngForm] = useState({
    name: "",
    quantity: "",
    unit: "kg",
    category: "Otros"
  });

  const [editIngId, setEditIngId] = useState(null);
  const [editIngVal, setEditIngVal] = useState("");
  const [editIngUnit, setEditIngUnit] = useState("kg");

  const { data: recipeData, refetch: refetchRecipe } = useQuery(GET_DISH_INGREDIENTS, {
    variables: { dish_id: dish.id }
  });

  const [addIngredient, { loading: adding }] = useMutation(ADD_DISH_INGREDIENT, {
    onError: (e) => alert(e.message)
  });

  const [updateDishIngredient] = useMutation(UPDATE_DISH_INGREDIENT, {
    onCompleted: () => refetchRecipe(),
    onError: (e) => alert(e.message)
  });

  const [removeIngredient] = useMutation(REMOVE_DISH_INGREDIENT, {
    onCompleted: () => refetchRecipe(),
    onError: (e) => alert(e.message)
  });

  const [createGlobalIngredient] = useMutation(CREATE_INGREDIENT, {
    refetchQueries: [{ query: GET_INGREDIENTS, variables: { location_id: null } }],
    onError: (e) => alert("Error creando ingrediente global: " + e.message)
  });

  const handleAdd = async () => {
    if (!ingForm.name.trim() || !ingForm.quantity || parseFloat(ingForm.quantity) <= 0) {
      if (ingForm.quantity && parseFloat(ingForm.quantity) <= 0) {
        alert("La cantidad debe ser mayor a cero");
      }
      return;
    }

    const normalizedName = ingForm.name.trim().charAt(0).toUpperCase() + ingForm.name.trim().slice(1);
    
    try {
      let ingredientId;
      const existing = ingredients?.find(i => i.name.toLowerCase() === normalizedName.toLowerCase());
      
      if (existing) {
        ingredientId = existing.id;
      } else {
        const { data } = await createGlobalIngredient({
          variables: { input: { name: normalizedName, unit: ingForm.unit, category: ingForm.category, location_id: null, cost_per_unit: 0 } }
        });
        ingredientId = data.createIngredient.id;
        await refetchIngredients();
      }

      await addIngredient({
        variables: {
          input: {
            dish_id: parseInt(dish.id),
            ingredient_id: parseInt(ingredientId),
            quantity: parseFloat(ingForm.quantity),
            unit: ingForm.unit
          }
        }
      });
      refetchRecipe();
      setIngForm({ name: "", quantity: "", unit: "kg", category: "Otros" });
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "flex-end", zIndex: 1000 }}>
      <div style={{ width: "100%", maxWidth: "500px", height: "100vh", backgroundColor: "white", padding: "2.5rem", boxShadow: "-20px 0 50px rgba(0,0,0,0.2)", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "800", color: COLORS.secondary }}>Receta Maestra</h3>
            <p style={{ margin: "0.25rem 0 0 0", color: COLORS.primary, fontWeight: "700" }}>{dish.name}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer" }}><XCircle size={24} /></button>
        </div>

        {/* Add Ingredient Section */}
        <div style={{ backgroundColor: COLORS.bg, padding: "1.5rem", borderRadius: "1.25rem", marginBottom: "2rem", border: `1px solid ${COLORS.border}` }}>
          <p style={{ margin: "0 0 1rem 0", fontWeight: "800", fontSize: "0.8rem", textTransform: "uppercase", color: COLORS.textMuted }}>Agregar Ingrediente Base</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <input 
              value={ingForm.name} 
              onChange={e => setIngForm({...ingForm, name: e.target.value})}
              placeholder="Nombre del ingrediente (ej: Tomate)" 
              style={inputStyle} 
            />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input 
                type="number" 
                value={ingForm.quantity} 
                onChange={e => setIngForm({...ingForm, quantity: e.target.value})}
                placeholder="Gramaje/Cant" 
                style={{ ...inputStyle, flex: 2 }} 
              />
              <select 
                value={ingForm.unit} 
                onChange={e => setIngForm({...ingForm, unit: e.target.value})}
                style={{ ...inputStyle, flex: 1 }}
              >
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <button 
              onClick={handleAdd}
              disabled={adding}
              style={{ width: "100%", padding: "0.75rem", borderRadius: "0.75rem", border: "none", backgroundColor: COLORS.secondary, color: "white", fontWeight: "700", cursor: "pointer" }}
            >
              {adding ? "Agregando..." : "Agregar Ingrediente"}
            </button>
          </div>
        </div>

        {/* Recipe List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <p style={{ margin: "0 0 0.5rem 0", fontWeight: "800", fontSize: "0.8rem", textTransform: "uppercase", color: COLORS.textMuted }}>Ingredientes Actuales</p>
          {recipeData?.DishIngredients?.map(ing => {
            const masterIng = ingredients?.find(i => String(i.id) === String(ing.ingredient_id));
            return (
              <div key={ing.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", backgroundColor: "white", border: `1px dashed ${COLORS.border}`, borderRadius: "1rem" }}>
                <div>
                  <p style={{ margin: 0, fontWeight: "700", fontSize: "0.95rem" }}>{masterIng?.name || "Ingrediente..."}</p>
                  
                  {editIngId === ing.id ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
                      <input 
                        type="number"
                        step="any"
                        value={editIngVal}
                        onChange={(e) => setEditIngVal(e.target.value)}
                        style={{ ...inputStyle, width: "70px", padding: "0.2rem 0.4rem", margin: 0, fontSize: "0.8rem" }}
                        autoFocus
                      />
                      <select 
                        value={editIngUnit} 
                        onChange={e => setEditIngUnit(e.target.value)}
                        style={{ ...inputStyle, width: "60px", padding: "0.2rem 0.4rem", margin: 0, fontSize: "0.8rem" }}
                      >
                        {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <button 
                        onClick={() => {
                          updateDishIngredient({ variables: { id: ing.id, quantity: parseFloat(editIngVal), unit: editIngUnit } });
                          setEditIngId(null);
                        }}
                        style={{ padding: "0.2rem 0.5rem", borderRadius: "0.5rem", border: "none", backgroundColor: COLORS.success, color: "white", cursor: "pointer", display: "flex", alignItems: "center" }}
                      >
                        <CheckCircle2 size={14} />
                      </button>
                      <button 
                        onClick={() => setEditIngId(null)}
                        style={{ padding: "0.2rem 0.5rem", borderRadius: "0.5rem", border: `1px solid ${COLORS.border}`, backgroundColor: "white", color: COLORS.text, cursor: "pointer", display: "flex", alignItems: "center" }}
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  ) : (
                    <p style={{ margin: "0.1rem 0 0 0", fontSize: "0.8rem", color: COLORS.primary, fontWeight: "700" }}>{ing.quantity} {ing.unit}</p>
                  )}
                </div>
                
                {editIngId !== ing.id && (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button 
                      onClick={() => {
                        setEditIngId(ing.id);
                        setEditIngVal(String(ing.quantity));
                        setEditIngUnit(ing.unit);
                      }}
                      style={{ color: COLORS.textMuted, background: "none", border: "none", cursor: "pointer" }}
                      title="Editar gramaje"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => removeIngredient({ variables: { id: ing.id } })}
                      style={{ color: COLORS.danger, background: "none", border: "none", cursor: "pointer" }}
                      title="Eliminar de la receta"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {(!recipeData?.DishIngredients || recipeData.DishIngredients.length === 0) && (
            <div style={{ textAlign: "center", padding: "2rem", color: COLORS.textMuted }}>
              <Scale size={32} opacity={0.2} style={{ marginBottom: "0.5rem" }} />
              <p style={{ fontSize: "0.85rem", margin: 0 }}>No hay ingredientes en la receta aún.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Main Page Component ---
export default function MenuBank() {
  const [editorDish, setEditorDish] = useState(null);
  const [recipeDish, setRecipeDish] = useState(null);
  const [search, setSearch] = useState("");

  const { data: dishesData, loading, refetch } = useQuery(GET_DISHES, {
    variables: { onlyGlobal: true }
  });

  const { data: ingsData, refetch: refetchIngs } = useQuery(GET_INGREDIENTS, {
    variables: { location_id: null }
  });

  const [deactivate] = useMutation(DEACTIVATE_DISH, { onCompleted: () => refetch() });
  const [activate] = useMutation(ACTIVATE_DISH, { onCompleted: () => refetch() });

  const filteredDishes = dishesData?.dishes?.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1rem" }}>
      {/* Header View */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2.5rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: "900", color: COLORS.secondary, letterSpacing: "-0.03em" }}>Banco de Menú</h1>
          <p style={{ margin: "0.25rem 0 0 0", color: COLORS.textMuted, fontWeight: "500" }}>Gestiona las recetas maestras de toda la cadena.</p>
        </div>
        <button 
          onClick={() => setEditorDish({})} 
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", backgroundColor: COLORS.primary, color: "white", border: "none", borderRadius: "1rem", fontWeight: "700", cursor: "pointer", boxShadow: "0 10px 15px -3px rgba(234, 88, 12, 0.3)" }}
        >
          <Plus size={20} /> Nuevo Plato Maestro
        </button>
      </div>

      {/* Warning Box */}
      <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", padding: "1rem 1.5rem", borderRadius: "1rem", marginBottom: "2rem", display: "flex", gap: "1rem", alignItems: "center" }}>
        <AlertTriangle color={COLORS.warning} size={24} />
        <p style={{ margin: 0, color: "#92400e", fontSize: "0.85rem", fontWeight: "600" }}>
          <strong>Aviso de Gerencia:</strong> Cualquier cambio en los gramajes o ingredientes aquí se reflejará instantáneamente en los costos de todas las sedes.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: COLORS.textMuted }} size={18} />
          <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre de plato..." 
            style={{ ...inputStyle, paddingLeft: "3rem", marginBottom: 0 }} 
          />
        </div>
      </div>

      {/* Dish Grid */}
      {loading ? (
        <p>Cargando banco de datos...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" }}>
          {filteredDishes.map(dish => {
            const styles = CATEGORIA_ESTILOS[dish.category] || CATEGORIA_ESTILOS.principal;
            return (
              <div key={dish.id} style={{ backgroundColor: "white", borderRadius: "1.5rem", padding: "1.5rem", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", position: "relative", transition: "transform 0.2s", cursor: "default" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                   <span style={{ backgroundColor: styles.bg, color: styles.text, border: `1px solid ${styles.border}`, padding: "0.25rem 0.75rem", borderRadius: "2rem", fontSize: "0.7rem", fontWeight: "800", textTransform: "uppercase" }}>
                    {dish.category}
                  </span>
                  {dish.is_active ? <CheckCircle2 size={16} color={COLORS.success} /> : <XCircle size={16} color={COLORS.danger} />}
                </div>

                <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem", fontWeight: "800", color: COLORS.secondary }}>{dish.name}</h3>
                <p style={{ margin: "0 0 1.5rem 0", fontSize: "0.85rem", color: COLORS.textMuted, height: "2.5rem", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {dish.description || "Sin descripción proporcionada."}
                </p>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button 
                    onClick={() => setRecipeDish(dish)}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", padding: "0.6rem", borderRadius: "0.75rem", border: `1.5px solid ${COLORS.primary}`, backgroundColor: "white", color: COLORS.primary, fontWeight: "700", fontSize: "0.8rem", cursor: "pointer" }}
                  >
                    <Scale size={16} /> Receta
                  </button>
                  <button 
                    onClick={() => setEditorDish(dish)}
                    style={{ padding: "0.6rem", borderRadius: "0.75rem", border: `1.5px solid ${COLORS.border}`, backgroundColor: "white", color: COLORS.textMuted, cursor: "pointer" }}
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => dish.is_active ? deactivate({ variables: { id: dish.id } }) : activate({ variables: { id: dish.id } })}
                    style={{ padding: "0.6rem", borderRadius: "0.75rem", border: `1.5px solid ${dish.is_active ? COLORS.danger : COLORS.success}20`, backgroundColor: `${dish.is_active ? COLORS.danger : COLORS.success}10`, color: dish.is_active ? COLORS.danger : COLORS.success, cursor: "pointer" }}
                    title={dish.is_active ? "Desactivar Plato" : "Activar Plato"}
                  >
                    <Power size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {editorDish && (
        <DishEditorModal 
          dish={editorDish.id ? editorDish : null} 
          onClose={() => setEditorDish(null)} 
          onSaved={() => { setEditorDish(null); refetch(); }} 
        />
      )}

      {recipeDish && (
        <RecipeEditor 
          dish={recipeDish} 
          ingredients={ingsData?.ingredients}
          refetchIngredients={refetchIngs}
          onClose={() => setRecipeDish(null)} 
        />
      )}
    </div>
  );
}
