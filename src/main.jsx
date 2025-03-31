import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import "./setup.js"
import { SocketProvider } from './context/SocketProvider.jsx'
import { store, persistor } from './redux/store.js'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'

ReactDOM.createRoot(document.getElementById('root')).render(


  <PersistGate persistor={persistor}>
    <Provider store={store}>
      <SocketProvider>
        <App className="w-full" />
      </SocketProvider>
    </Provider>
  </PersistGate>,


)
