import React from 'react'
import ReactDOM from 'react-dom/client'
import { ApolloProvider } from '@apollo/client/react';
import { client } from './apollo/client';
import { AuthProvider } from './context/AuthContext'
import App from './App.jsx'
import './index.css'

import { PayPalScriptProvider } from "@paypal/react-paypal-js";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <PayPalScriptProvider options={{ 
        "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID || "AeSN2sCKWvhzWCaAHCVcuDJ25-OYmnlH82yzSaGNZm1_jRqT-uEChK0o6Vdf5OsNCZjDmGSzZw9eV98c",
        currency: "USD",
        intent: "capture"
      }}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </PayPalScriptProvider>
    </ApolloProvider>
  </React.StrictMode>,
)
