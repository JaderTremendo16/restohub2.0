import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Ingredients from "./pages/Ingredients";
import Suppliers from "./pages/Suppliers";
import Menu from "./pages/Menu";
import Inventory from "./pages/Inventory";
import Staff from "./pages/Staff";
import GerenteGeneral from "./pages/GerenteGeneral";
import MenuGlobal from "./pages/MenuGlobal";
import OrdersDashboard from "./pages/OrdersDashboard";
import KitchenDashboard from "./pages/KitchenDashboard";
import PosDashboard from "./pages/PosDashboard";
import Reportes from "./pages/Reportes";
import ClientManagement from "./pages/loyalty/ClientManagement";
import PromotionsManagement from "./pages/loyalty/PromotionsManagement";
import RewardsManagement from "./pages/loyalty/RewardsManagement";
import ReviewCenter from "./pages/loyalty/ReviewCenter";
import MenuBank from "./pages/MenuBank";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/gestion-global" element={<GerenteGeneral />} />
        <Route path="/ingredientes" element={<Ingredients />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/inventario" element={<Inventory />} />
        <Route path="/proveedores" element={<Suppliers />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="/menu-global" element={<MenuGlobal />} />
        <Route path="/orders" element={<OrdersDashboard />} />
        <Route path="/kitchen" element={<KitchenDashboard />} />
        <Route path="/menu-bank" element={<MenuBank />} />
        <Route path="/pos" element={<PosDashboard />} />
        <Route path="/reportes" element={<Reportes />} />
        <Route path="/loyalty/clientes" element={<ClientManagement />} />
        <Route path="/loyalty/promociones" element={<PromotionsManagement />} />
        <Route path="/loyalty/premios" element={<RewardsManagement />} />
        <Route path="/loyalty/resenas" element={<ReviewCenter />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
