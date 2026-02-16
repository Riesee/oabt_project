import { registerRootComponent } from 'expo';
import App from './App';
import mobileAds from 'react-native-google-mobile-ads';

// Initialize Ads as early as possible
mobileAds()
    .initialize()
    .then(() => {

    })
    .catch(e => console.error('AdMob Init Error:', e));

registerRootComponent(App);
