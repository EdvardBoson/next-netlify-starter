import '@styles/globals.css'
import { StoreProvider } from '@lib/store'

function Application({ Component, pageProps }) {
  return (
    <StoreProvider>
      <Component {...pageProps} />
    </StoreProvider>
  )
}

export default Application
