import { Platform } from 'react-native';

// Replace this with your computer's local IP address
// Find it by running 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux)
const LOCAL_IP = '192.168.1.106'; // TODO: Change this to your local IP for physical device testing 

export const API_URL = `http://${LOCAL_IP}:8080`;
