import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { io, Socket } from 'socket.io-client';

// Establish the WebSocket Connection to your Backend
const socket: Socket = io('http://localhost:3000');

interface UserSession { id: string; name: string; email: string; company: string; }
interface RideMatch { id: string; driverId: string; driverName: string; company: string; origin: string; destination: string; departureTime: string; price: number; }

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'LOGIN' | 'OTP_CHECK' | 'DASHBOARD' | 'OFFER' | 'FIND' | 'LIVE_RIDE'>('LOGIN');
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [globalLoading, setGlobalLoading] = useState(false);

  // Authentication States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginName, setLoginName] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [debugCodeHint, setDebugCodeHint] = useState('');

  // App Core States
  const [activeInputContext, setActiveInputContext] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [offerOrigin, setOfferOrigin] = useState('');
  const [offerDestination, setOfferDestination] = useState('');
  const [searchOrigin, setSearchOrigin] = useState('');
  const [searchDestination, setSearchDestination] = useState('');
  const [searchResults, setSearchResults] = useState<RideMatch[]>([]);

  // ==========================================
  // REAL-TIME RIDE STATES
  // ==========================================
  const [activeRideDetails, setActiveRideDetails] = useState<RideMatch | null>(null);
  const [driverArrived, setDriverArrived] = useState(false);
  const [liveDistanceHint, setLiveDistanceHint] = useState('Tracking car location...');

  const API_URL = 'http://localhost:3000/api';

  useEffect(() => {
    // Listen for WebSocket events from the driver
    socket.on('live_location_ping', (location) => {
      setLiveDistanceHint(`Vehicle approaching... ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`);
    });

    socket.on('arrival_notification', (data) => {
      setDriverArrived(true);
      Alert.alert('🚗 Driver Arrived!', 'Your carpool partner is waiting at the pickup point.');
    });

    return () => {
      socket.off('live_location_ping');
      socket.off('arrival_notification');
    };
  }, []);

  const triggerLocationSearch = async (text: string, context: string) => {
    setActiveInputContext(context);
    if (context === 'OFFER_ORIGIN') setOfferOrigin(text);
    if (context === 'OFFER_DEST') setOfferDestination(text);
    if (context === 'SEARCH_ORIGIN') setSearchOrigin(text);
    if (context === 'SEARCH_DEST') setSearchDestination(text);

    if (text.length < 3) { setSuggestions([]); return; }

    try {
      const response = await fetch(`${API_URL}/location/autocomplete?query=${encodeURIComponent(text)}`);
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch { }
  };

  const selectLocation = (name: string, context: string) => {
    if (context === 'OFFER_ORIGIN') setOfferOrigin(name);
    if (context === 'OFFER_DEST') setOfferDestination(name);
    if (context === 'SEARCH_ORIGIN') setSearchOrigin(name);
    if (context === 'SEARCH_DEST') setSearchDestination(name);
    setSuggestions([]); setActiveInputContext(null);
  };

  const handleAuth = async () => {
    setGlobalLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/corporate-verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: loginEmail, name: loginName, gender: 'male' }) });
      const data = await response.json();
      setDebugCodeHint(data.debugOtpConfirmationCode || '');
      setCurrentScreen('OTP_CHECK');
    } catch { } finally { setGlobalLoading(false); }
  };

  const verifyOtp = async () => {
    setGlobalLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/confirm-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: loginEmail, otp: enteredOtp }) });
      const data = await response.json();
      setCurrentUser(data.user);
      setCurrentScreen('DASHBOARD');
    } catch { } finally { setGlobalLoading(false); }
  };

  const publishRide = async () => {
    setGlobalLoading(true);
    try {
      const response = await fetch(`${API_URL}/rides/offer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ driverId: currentUser?.id, origin: offerOrigin, destination: offerDestination }) });
      const data = await response.json();
      
      // Driver enters the Live Ride tracking room
      socket.emit('join_ride_room', data.ride.id);
      setActiveRideDetails(data.ride);
      setCurrentScreen('LIVE_RIDE');
    } catch { } finally { setGlobalLoading(false); }
  };

  const searchRides = async () => {
    setGlobalLoading(true);
    try {
      const response = await fetch(`${API_URL}/rides/search?origin=${searchOrigin}&destination=${searchDestination}&riderId=${currentUser?.id}`);
      const data = await response.json();
      setSearchResults(data.rides || []);
    } catch { } finally { setGlobalLoading(false); }
  };

  const bookRide = async (ride: RideMatch) => {
    setGlobalLoading(true);
    try {
      const response = await fetch(`${API_URL}/rides/book`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rideId: ride.id, riderId: currentUser?.id }) });
      const data = await response.json();
      
      // Rider enters the Live Ride tracking room
      socket.emit('join_ride_room', ride.id);
      setActiveRideDetails(ride);
      setCurrentScreen('LIVE_RIDE');
      
      Alert.alert('Booking Confirmed', `Give the driver PIN: ${data.booking.verificationPasscode}`);
    } catch { } finally { setGlobalLoading(false); }
  };

  // ==========================================
  // DRIVER REAL-TIME ACTIONS
  // ==========================================
  const emitLocationUpdate = () => {
    // In production, this uses expo-location to send actual GPS coordinates on an interval.
    // Simulating GPS movement for desktop web testing.
    socket.emit('driver_location_update', {
      rideId: activeRideDetails?.id,
      location: { lat: 15.3173 + Math.random() * 0.01, lon: 75.7139 + Math.random() * 0.01 }
    });
    Alert.alert('GPS Sent', 'Live location broadcasted to rider.');
  };

  const notifyArrival = () => {
    socket.emit('driver_arrived', activeRideDetails?.id);
    Alert.alert('Rider Notified', 'Push notification sent to rider.');
  };

  return (
    <SafeAreaView style={styles.appContainer}>
      <View style={styles.appHeader}>
        <Text style={styles.brandTitleText}>🤝 PACT</Text>
        {currentUser && <View style={styles.userProfilePillBadge}><Text style={styles.userBadgeTextText}>{currentUser.name}</Text></View>}
      </View>

      {globalLoading && <View style={styles.loader}><ActivityIndicator size="large" color="#10B981" /></View>}

      <ScrollView contentContainerStyle={styles.screenScrollLayout} keyboardShouldPersistTaps="handled">
        {currentScreen === 'LOGIN' && (
          <View style={styles.card}>
            <Text style={styles.headerText}>Enterprise Login</Text>
            <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#9CA3AF" value={loginName} onChangeText={setLoginName} />
            <TextInput style={styles.input} placeholder="corporate@company.com" placeholderTextColor="#9CA3AF" value={loginEmail} onChangeText={setLoginEmail} autoCapitalize="none" keyboardType="email-address" />
            <TouchableOpacity style={styles.button} onPress={handleAuth}><Text style={styles.buttonText}>Get Access Token</Text></TouchableOpacity>
          </View>
        )}

        {currentScreen === 'OTP_CHECK' && (
          <View style={styles.card}>
            <Text style={styles.headerText}>Security Check</Text>
            <Text style={{color: '#F59E0B', marginBottom: 10}}>Check Console for Pin: {debugCodeHint}</Text>
            <TextInput style={styles.input} placeholder="0000" placeholderTextColor="#9CA3AF" keyboardType="numeric" maxLength={4} value={enteredOtp} onChangeText={setEnteredOtp} />
            <TouchableOpacity style={styles.button} onPress={verifyOtp}><Text style={styles.buttonText}>Verify Token</Text></TouchableOpacity>
          </View>
        )}

        {currentScreen === 'DASHBOARD' && (
          <View style={{ width: '100%' }}>
            <TouchableOpacity style={[styles.card, {backgroundColor: '#1E293B', borderColor: '#10B981'}]} onPress={() => setCurrentScreen('FIND')}>
              <Text style={styles.headerText}>🔍 Find Commute</Text>
              <Text style={{color: '#9CA3AF'}}>Search for available verified corporate drivers.</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.card, {backgroundColor: '#1E293B'}]} onPress={() => setCurrentScreen('OFFER')}>
              <Text style={styles.headerText}>🚗 Offer Commute</Text>
              <Text style={{color: '#9CA3AF'}}>Publish your route and pick up colleagues.</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentScreen === 'OFFER' && (
          <View style={styles.card}>
            <Text style={styles.headerText}>Publish Route</Text>
            <TextInput style={styles.input} placeholder="Exact Apartment, Gate, or Street..." placeholderTextColor="#9CA3AF" value={offerOrigin} onChangeText={(t) => triggerLocationSearch(t, 'OFFER_ORIGIN')} />
            {activeInputContext === 'OFFER_ORIGIN' && suggestions.map((s, i) => <TouchableOpacity key={i} onPress={() => selectLocation(s.displayName, 'OFFER_ORIGIN')}><Text style={styles.suggText}>{s.displayName}</Text></TouchableOpacity>)}
            
            <TextInput style={styles.input} placeholder="Tech Park, Office Block..." placeholderTextColor="#9CA3AF" value={offerDestination} onChangeText={(t) => triggerLocationSearch(t, 'OFFER_DEST')} />
            {activeInputContext === 'OFFER_DEST' && suggestions.map((s, i) => <TouchableOpacity key={i} onPress={() => selectLocation(s.displayName, 'OFFER_DEST')}><Text style={styles.suggText}>{s.displayName}</Text></TouchableOpacity>)}

            <TouchableOpacity style={styles.button} onPress={publishRide}><Text style={styles.buttonText}>Publish & Start Driving</Text></TouchableOpacity>
          </View>
        )}

        {currentScreen === 'FIND' && (
          <View style={{ width: '100%' }}>
            <View style={styles.card}>
              <Text style={styles.headerText}>Scan Routes</Text>
              <TextInput style={styles.input} placeholder="Pickup Point" placeholderTextColor="#9CA3AF" value={searchOrigin} onChangeText={(t) => triggerLocationSearch(t, 'SEARCH_ORIGIN')} />
              <TextInput style={styles.input} placeholder="Drop Point" placeholderTextColor="#9CA3AF" value={searchDestination} onChangeText={(t) => triggerLocationSearch(t, 'SEARCH_DEST')} />
              <TouchableOpacity style={styles.button} onPress={searchRides}><Text style={styles.buttonText}>Search Routes</Text></TouchableOpacity>
            </View>

            {searchResults.map((ride) => (
              <View key={ride.id} style={styles.card}>
                <Text style={{color: '#fff', fontSize: 18, fontWeight: 'bold'}}>{ride.driverName} • {ride.company}</Text>
                <Text style={{color: '#9CA3AF', marginVertical: 8}}>📍 {ride.origin}  ➡  🏁 {ride.destination}</Text>
                <TouchableOpacity style={styles.button} onPress={() => bookRide(ride)}><Text style={styles.buttonText}>Book for ₹{ride.price}</Text></TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ========================================== */}
        {/* NEW REAL-TIME ACTIVE RIDE TRACKING SCREEN */}
        {/* ========================================== */}
        {currentScreen === 'LIVE_RIDE' && activeRideDetails && (
          <View style={styles.card}>
            <View style={{alignItems: 'center', marginBottom: 20}}>
              <Text style={{fontSize: 50}}>🗺️</Text>
              <Text style={styles.headerText}>Live Ride Tracking</Text>
            </View>
            
            <View style={{backgroundColor: '#1E293B', padding: 15, borderRadius: 10, marginBottom: 15}}>
              <Text style={{color: '#10B981', fontWeight: 'bold'}}>DRIVER: {activeRideDetails.driverName}</Text>
              <Text style={{color: '#fff', marginTop: 5}}>From: {activeRideDetails.origin}</Text>
              <Text style={{color: '#fff'}}>To: {activeRideDetails.destination}</Text>
            </View>

            {/* DRIVER VIEW */}
            {currentUser?.id === activeRideDetails.driverId ? (
              <View>
                <Text style={{color: '#9CA3AF', textAlign: 'center', marginBottom: 10}}>Driver Controls</Text>
                <TouchableOpacity style={[styles.button, {backgroundColor: '#3B82F6', marginBottom: 10}]} onPress={emitLocationUpdate}>
                  <Text style={styles.buttonText}>📡 Stream Live GPS</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, {backgroundColor: '#10B981'}]} onPress={notifyArrival}>
                  <Text style={styles.buttonText}>🔔 Notify: "I Have Arrived"</Text>
                </TouchableOpacity>
              </View>
            ) : 
            /* RIDER VIEW */
            (
              <View style={{alignItems: 'center'}}>
                {driverArrived ? (
                  <View style={{backgroundColor: '#064E3B', padding: 20, borderRadius: 10, width: '100%'}}>
                    <Text style={{color: '#34D399', fontSize: 18, fontWeight: 'bold', textAlign: 'center'}}>🚨 DRIVER OUTSIDE</Text>
                    <Text style={{color: '#fff', textAlign: 'center', marginTop: 5}}>Please proceed to the pickup point immediately.</Text>
                  </View>
                ) : (
                  <View>
                    <ActivityIndicator size="small" color="#3B82F6" />
                    <Text style={{color: '#60A5FA', marginTop: 10}}>{liveDistanceHint}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
      
      {currentScreen !== 'LOGIN' && currentScreen !== 'OTP_CHECK' && currentScreen !== 'LIVE_RIDE' && (
        <View style={styles.footer}><TouchableOpacity onPress={() => setCurrentScreen('DASHBOARD')}><Text style={{color: '#fff'}}>Dashboard</Text></TouchableOpacity></View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appContainer: { flex: 1, backgroundColor: '#0B0F19' },
  appHeader: { height: 70, paddingHorizontal: 20, backgroundColor: '#111827', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  brandTitleText: { fontSize: 20, fontWeight: '900', color: '#fff' },
  userProfilePillBadge: { backgroundColor: '#1E293B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  userBadgeTextText: { fontSize: 12, fontWeight: '700', color: '#10B981' },
  screenScrollLayout: { padding: 20, alignItems: 'center' },
  card: { width: '100%', backgroundColor: '#111827', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#1E293B', marginBottom: 15 },
  headerText: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 15 },
  input: { width: '100%', height: 50, borderWidth: 1, borderColor: '#334155', borderRadius: 10, paddingHorizontal: 15, marginBottom: 15, backgroundColor: '#1E293B', color: '#fff' },
  button: { width: '100%', backgroundColor: '#10B981', paddingVertical: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  suggText: { color: '#fff', padding: 10, borderBottomWidth: 1, borderBottomColor: '#334155' },
  loader: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,15,25,0.8)', zIndex: 999, justifyContent: 'center', alignItems: 'center' },
  footer: { height: 60, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#1E293B' }
});
