import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView,
  Alert,
  Switch
} from 'react-native';

interface UserSession {
  id: string;
  name: string;
  email: string;
  company: string;
  isCorporateVerified: boolean;
  gender: string;
}

interface RideMatch {
  id: string;
  driverName: string;
  company: string;
  origin: string;
  destination: string;
  departureTime: string;
  availableSeats: number;
  price: number;
  silentRide: boolean;
  womenOnly: boolean;
  deviationMinutes: number;
  sharesCorporateNetwork: boolean;
}

interface SpatialSuggestion {
  displayName: string;
  lat: string;
  lon: string;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'LOGIN' | 'OTP_CHECK' | 'DASHBOARD' | 'OFFER' | 'FIND'>('LOGIN');
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

  // Authentication Fields Data States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginGender, setLoginGender] = useState('female');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [debugCodeHint, setDebugCodeHint] = useState('');

  // Location suggestions array maps states
  const [originSuggestions, setOriginSuggestions] = useState<SpatialSuggestion[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<SpatialSuggestion[]>([]);
  const [activeInputContext, setActiveInputContext] = useState<'OFFER_ORIGIN' | 'OFFER_DEST' | 'SEARCH_ORIGIN' | 'SEARCH_DEST' | null>(null);

  // Offer Creation States
  const [offerOrigin, setOfferOrigin] = useState('');
  const [offerDestination, setOfferDestination] = useState('');
  const [offerTime, setOfferTime] = useState('');
  const [offerSeats, setOfferSeats] = useState('3');
  const [offerPrice, setOfferPrice] = useState('120');
  const [optSilent, setOptSilent] = useState(false);
  const [optWomenOnly, setOptWomenOnly] = useState(false);

  // Search/Discovery System States
  const [searchOrigin, setSearchOrigin] = useState('');
  const [searchDestination, setSearchDestination] = useState('');
  const [searchResults, setSearchResults] = useState<RideMatch[]>([]);

  const API_URL = 'http://localhost:3000/api';

  // Live Location Autocomplete Controller Hook implementation
  const triggerLocationSearch = async (text: string, context: 'ORIGIN' | 'DEST') => {
    if (context === 'ORIGIN') {
      if (activeInputContext === 'OFFER_ORIGIN') setOfferOrigin(text);
      if (activeInputContext === 'SEARCH_ORIGIN') setSearchOrigin(text);
    } else {
      if (activeInputContext === 'OFFER_DEST') setOfferDestination(text);
      if (activeInputContext === 'SEARCH_DEST') setSearchDestination(text);
    }

    if (text.length < 3) {
      if (context === 'ORIGIN') setOriginSuggestions([]);
      if (context === 'DEST') setDestSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/location/autocomplete?query=${encodeURIComponent(text)}`);
      const data = await response.json();
      if (context === 'ORIGIN') setOriginSuggestions(data.suggestions || []);
      if (context === 'DEST') setDestSuggestions(data.suggestions || []);
    } catch {
      console.log('Location autocomplete server communication offline.');
    }
  };

  const handleSelectLocation = (displayName: string, context: 'OFFER_ORIGIN' | 'OFFER_DEST' | 'SEARCH_ORIGIN' | 'SEARCH_DEST') => {
    const shortenedName = displayName.split(',')[0] + ', ' + displayName.split(',')[1];
    if (context === 'OFFER_ORIGIN') setOfferOrigin(shortenedName);
    if (context === 'OFFER_DEST') setOfferDestination(shortenedName);
    if (context === 'SEARCH_ORIGIN') setSearchOrigin(shortenedName);
    if (context === 'SEARCH_DEST') setSearchDestination(shortenedName);
    
    setOriginSuggestions([]);
    setDestSuggestions([]);
    setActiveInputContext(null);
  };

  const handleCorporateHandshake = async () => {
    if (!loginEmail || !loginName) {
      Alert.alert('Missing Parameters', 'Please fill out all registration items.');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/auth/corporate-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, name: loginName, gender: loginGender })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      setDebugCodeHint(data.debugOtpConfirmationCode || '');
      setCurrentScreen('OTP_CHECK');
    } catch (err: any) {
      Alert.alert('Verification Error', err.message || 'Server connection failed.');
    }
  };

  const verifyOtpTokenCode = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/confirm-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, otp: enteredOtp })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setCurrentUser(data.user);
      setCurrentScreen('DASHBOARD');
    } catch (err: any) {
      Alert.alert('Access Denied', err.message || 'OTP validation operation failed.');
    }
  };

  const dispatchOfferSubmission = async () => {
    if (!offerOrigin || !offerDestination || !offerTime) {
      Alert.alert('Error', 'Please provide clean geolocation route indices parameters.');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/rides/offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: currentUser?.id,
          origin: offerOrigin,
          destination: offerDestination,
          departureTime: offerTime,
          availableSeats: offerSeats,
          price: offerPrice,
          silentRide: optSilent,
          womenOnly: optWomenOnly
        })
      });
      if (!response.ok) throw new Error();
      Alert.alert('Route Active', 'Your carpool offering route is now active globally.');
      setCurrentScreen('DASHBOARD');
    } catch {
      Alert.alert('Network Issue', 'Failed to synchronize route configuration parameters to cluster.');
    }
  };

  const executeRouteSearchQuery = async () => {
    try {
      const response = await fetch(
        `${API_URL}/rides/search?origin=${searchOrigin}&destination=${searchDestination}&riderId=${currentUser?.id}`
      );
      const data = await response.json();
      setSearchResults(data.rides || []);
      if ((data.rides || []).length === 0) {
        Alert.alert('No Matches', 'No active rides match your routing or profile rules right now.');
      }
    } catch {
      Alert.alert('Search Failure', 'API communication error during spatial vector scan mapping queries.');
    }
  };

  const processBookingTransaction = async (rideId: string) => {
    try {
      const response = await fetch(`${API_URL}/rides/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rideId, riderId: currentUser?.id })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      Alert.alert('Pact Secured!', `Transaction completed. Give your driver code: ${data.booking.verificationPasscode}`);
      setCurrentScreen('DASHBOARD');
    } catch (err: any) {
      Alert.alert('Booking Aborted', err.message || 'Internal ledger synchronization failure.');
    }
  };

  return (
    <SafeAreaView style={styles.appContainer}>
      <View style={styles.appHeader}>
        <Text style={styles.brandTitleText}>🤝 PACT</Text>
        {currentUser && (
          <Text style={styles.userBadgeText}>
            {currentUser.name} • <Text style={{ color: '#10B981' }}>{currentUser.company}</Text>
          </Text>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.screenScrollLayout} keyboardShouldPersistTaps="handled">
        {currentScreen === 'LOGIN' && (
          <View style={styles.cardUIElement}>
            <Text style={styles.sectionHeaderLabelText}>Enterprise Access Gateway</Text>
            <Text style={styles.supportingHelperBodyText}>Enter your details and a secure corporate domain email (e.g., mail@techcorp.com, work@google.com, test@pact.com).</Text>
            
            <TextInput style={styles.formTextInputField} placeholder="Full Legal Name" value={loginName} onChangeText={setLoginName} />
            <TextInput style={styles.formTextInputField} placeholder="corporate@company.com" value={loginEmail} onChangeText={setLoginEmail} autoCapitalize="none" keyboardType="email-address" />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginVertical: 12 }}>
              <TouchableOpacity style={[styles.genderSelectChipTab, loginGender === 'female' && styles.genderSelectChipTabSelected]} onPress={() => setLoginGender('female')}>
                <Text style={loginGender === 'female' ? styles.chipTextSelected : styles.chipTextUnselected}>Female Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.genderSelectChipTab, loginGender === 'male' && styles.genderSelectChipTabSelected]} onPress={() => setLoginGender('male')}>
                <Text style={loginGender === 'male' ? styles.chipTextSelected : styles.chipTextUnselected}>Male Profile</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.actionExecutionButton} onPress={handleCorporateHandshake}>
              <Text style={styles.actionButtonLabelText}>Request Access Token</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentScreen === 'OTP_CHECK' && (
          <View style={styles.cardUIElement}>
            <Text style={styles.sectionHeaderLabelText}>Confirm Secure Token Code</Text>
            <Text style={styles.supportingHelperBodyText}>A verification token was logged to the cluster terminal core.</Text>
            {debugCodeHint ? <Text style={styles.debugTerminalCodeHint}>Development Test Code Bypass Value: {debugCodeHint}</Text> : null}
            
            <TextInput style={styles.formTextInputField} placeholder="Enter 4-Digit Pin Code" keyboardType="numeric" maxLength={4} value={enteredOtp} onChangeText={setEnteredOtp} />
            
            <TouchableOpacity style={styles.actionExecutionButton} onPress={verifyOtpTokenCode}>
              <Text style={styles.actionButtonLabelText}>Validate Security Profile</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentScreen === 'DASHBOARD' && (
          <View style={{ width: '100%' }}>
            <View style={styles.greenMetricImpactContainerBox}>
              <Text style={{ color: '#fff', fontSize: 14 }}>Eco-Impact Footprint Ledger</Text>
              <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700', marginVertical: 4 }}>14.2 kg CO₂ Saved</Text>
              <Text style={{ color: '#A7F3D0', fontSize: 12 }}>Pact Identity Tier Level: Carbon Catalyst Silver</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 20 }}>
              <TouchableOpacity style={[styles.actionExecutionButton, { flex: 1, marginRight: 8 }]} onPress={() => { setSearchResults([]); setCurrentScreen('FIND'); }}>
                <Text style={styles.actionButtonLabelText}>Find Carpool</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionExecutionButton, { flex: 1, marginLeft: 8, backgroundColor: '#4B5563' }]} onPress={() => setCurrentScreen('OFFER')}>
                <Text style={styles.actionButtonLabelText}>Offer Ride</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {currentScreen === 'OFFER' && (
          <View style={styles.cardUIElement}>
            <Text style={styles.sectionHeaderLabelText}>Publish Active Commute Route</Text>
            
            <TextInput 
              style={styles.formTextInputField} 
              placeholder="Origin: Type at least 3 letters..." 
              value={offerOrigin} 
              onFocus={() => setActiveInputContext('OFFER_ORIGIN')}
              onChangeText={(t) => triggerLocationSearch(t, 'ORIGIN')} 
            />
            {activeInputContext === 'OFFER_ORIGIN' && originSuggestions.map((item, i) => (
              <TouchableOpacity key={i} style={styles.autocompleteSuggestionRowTouch} onPress={() => handleSelectLocation(item.displayName, 'OFFER_ORIGIN')}>
                <Text style={styles.autocompleteRowLabelText} numberOfLines={1}>📍 {item.displayName}</Text>
              </TouchableOpacity>
            ))}

            <TextInput 
              style={styles.formTextInputField} 
              placeholder="Destination: Type at least 3 letters..." 
              value={offerDestination} 
              onFocus={() => setActiveInputContext('OFFER_DEST')}
              onChangeText={(t) => triggerLocationSearch(t, 'DEST')} 
            />
            {activeInputContext === 'OFFER_DEST' && destSuggestions.map((item, i) => (
              <TouchableOpacity key={i} style={styles.autocompleteSuggestionRowTouch} onPress={() => handleSelectLocation(item.displayName, 'OFFER_DEST')}>
                <Text style={styles.autocompleteRowLabelText} numberOfLines={1}>🏁 {item.displayName}</Text>
              </TouchableOpacity>
            ))}

            <TextInput style={styles.formTextInputField} placeholder="Departure Timing (e.g., 09:00 AM)" value={offerTime} onChangeText={setOfferTime} />
            <TextInput style={styles.formTextInputField} placeholder="Seats Available" keyboardType="numeric" value={offerSeats} onChangeText={setOfferSeats} />
            <TextInput style={styles.formTextInputField} placeholder="Fare Price Amount (INR)" keyboardType="numeric" value={offerPrice} onChangeText={setOfferPrice} />
            
            <View style={styles.toggleConstraintRowLayout}>
              <Text style={{ fontSize: 14, color: '#374151' }}>Request Silent Commute Route Preference</Text>
              <Switch value={optSilent} onValueChange={setOptSilent} />
            </View>

            <View style={styles.toggleConstraintRowLayout}>
              <Text style={{ fontSize: 14, color: '#374151' }}>Restrict Visibility to Women Pools Only</Text>
              <Switch value={optWomenOnly} onValueChange={setOptWomenOnly} />
            </View>

            <TouchableOpacity style={styles.actionExecutionButton} onPress={dispatchOfferSubmission}>
              <Text style={styles.actionButtonLabelText}>Register Carpool Route</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentScreen === 'FIND' && (
          <View style={{ width: '100%' }}>
            <View style={styles.cardUIElement}>
              <Text style={styles.sectionHeaderLabelText}>Scan Intersecting Commutes</Text>
              
              <TextInput 
                style={styles.formTextInputField} 
                placeholder="From: Starting location..." 
                value={searchOrigin} 
                onFocus={() => setActiveInputContext('SEARCH_ORIGIN')}
                onChangeText={(t) => triggerLocationSearch(t, 'ORIGIN')} 
              />
              {activeInputContext === 'SEARCH_ORIGIN' && originSuggestions.map((item, i) => (
                <TouchableOpacity key={i} style={styles.autocompleteSuggestionRowTouch} onPress={() => handleSelectLocation(item.displayName, 'SEARCH_ORIGIN')}>
                  <Text style={styles.autocompleteRowLabelText} numberOfLines={1}>📍 {item.displayName}</Text>
                </TouchableOpacity>
              ))}

              <TextInput 
                style={styles.formTextInputField} 
                placeholder="To: Target workplace or destination..." 
                value={searchDestination} 
                onFocus={() => setActiveInputContext('SEARCH_DEST')}
                onChangeText={(t) => triggerLocationSearch(t, 'DEST')} 
              />
              {activeInputContext === 'SEARCH_DEST' && destSuggestions.map((item, i) => (
                <TouchableOpacity key={i} style={styles.autocompleteSuggestionRowTouch} onPress={() => handleSelectLocation(item.displayName, 'SEARCH_DEST')}>
                  <Text style={styles.autocompleteRowLabelText} numberOfLines={1}>🏁 {item.displayName}</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity style={styles.actionExecutionButton} onPress={executeRouteSearchQuery}>
                <Text style={styles.actionButtonLabelText}>Scan Active Network Routes</Text>
              </TouchableOpacity>
            </View>

            {searchResults.map((ride) => (
              <View key={ride.id} style={styles.matchListingResultCardBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontWeight: '700', fontSize: 16 }}>{ride.driverName}</Text>
                  <Text style={{ fontWeight: '700', color: '#10B981', fontSize: 16 }}>₹{ride.price}</Text>
                </View>
                <Text style={{ color: '#4B5563', fontSize: 13, marginVertical: 3 }}>
                  Corporate Verification Node: <Text style={{ fontWeight: '700', color: '#059669' }}>{ride.company}</Text>
                </Text>
                <Text style={{ color: '#1F2937', fontSize: 13, marginTop: 2 }}>📍 From: {ride.origin}</Text>
                <Text style={{ color: '#1F2937', fontSize: 13 }}>🏁 To: {ride.destination}</Text>
                <Text style={{ fontSize: 13, marginTop: 6, fontWeight: '600', color: '#2563EB' }}>🕒 Leaves: {ride.departureTime} (Route Delta deviation: +{ride.deviationMinutes} mins)</Text>
                
                <View style={{ flexDirection: 'row', marginVertical: 8 }}>
                  {ride.silentRide && <View style={styles.preferenceMetaBadgeContainer}><Text style={styles.preferenceMetaBadgeTextText}>🔇 Silent Mode</Text></View>}
                  {ride.sharesCorporateNetwork && <View style={[styles.preferenceMetaBadgeContainer, { backgroundColor: '#DBEAFE' }]}><Text style={[styles.preferenceMetaBadgeTextText, { color: '#1E40AF' }]}>🏢 Intracompany Pool</Text></View>}
                </View>

                <TouchableOpacity style={[styles.actionExecutionButton, { marginTop: 8, paddingVertical: 10 }]} onPress={() => processBookingTransaction(ride.id)}>
                  <Text style={styles.actionButtonLabelText}>Secure Booking Agreement</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {currentScreen !== 'LOGIN' && currentScreen !== 'OTP_CHECK' && (
        <View style={styles.footerNavigationControlBar}>
          <TouchableOpacity onPress={() => setCurrentScreen('DASHBOARD')} style={styles.navBarInteractiveControlTab}>
            <Text style={{ fontWeight: '600', color: '#374151' }}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setCurrentUser(null); setCurrentScreen('LOGIN'); }} style={styles.navBarInteractiveControlTab}>
            <Text style={{ color: '#EF4444', fontWeight: '600' }}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appContainer: { flex: 1, backgroundColor: '#F3F4F6' },
  appHeader: { height: 60, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandTitleText: { fontSize: 22, fontWeight: '900', color: '#111827', letterSpacing: 1 },
  userBadgeText: { fontSize: 12, fontWeight: '700', color: '#374151', backgroundColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  screenScrollLayout: { padding: 16, alignItems: 'center' },
  cardUIElement: { width: '100%', backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, marginBottom: 16 },
  sectionHeaderLabelText: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 6 },
  supportingHelperBodyText: { fontSize: 13, color: '#4B5563', marginBottom: 16, lineHeight: 18 },
  debugTerminalCodeHint: { backgroundColor: '#FEF3C7', color: '#92400E', padding: 10, borderRadius: 8, fontSize: 12, fontWeight: '600', marginBottom: 12, borderWidth: 1, borderColor: '#FDE68A' },
  formTextInputField: { width: '100%', height: 46, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 14, marginBottom: 12, backgroundColor: '#FAFAFA', fontSize: 14 },
  autocompleteSuggestionRowTouch: { width: '100%', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#F9FAFB' },
  autocompleteRowLabelText: { fontSize: 13, color: '#374151' },
  genderSelectChipTab: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 24, borderWidth: 1, borderColor: '#D1D5DB' },
  genderSelectChipTabSelected: { backgroundColor: '#111827', borderColor: '#111827' },
  chipTextSelected: { color: '#fff', fontWeight: '700', fontSize: 13 },
  chipTextUnselected: { color: '#4B5563', fontSize: 13 },
  actionExecutionButton: { width: '100%', backgroundColor: '#111827', paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionButtonLabelText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  greenMetricImpactContainerBox: { width: '100%', backgroundColor: '#064E3B', padding: 22, borderRadius: 16 },
  toggleConstraintRowLayout: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 14 },
  matchListingResultCardBox: { width: '100%', backgroundColor: '#fff', padding: 18, borderRadius: 16, borderLeftWidth: 5, borderLeftColor: '#10B981', marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  preferenceMetaBadgeContainer: { backgroundColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, marginRight: 8 },
  preferenceMetaBadgeTextText: { fontSize: 11, fontWeight: '600', color: '#1F2937' },
  footerNavigationControlBar: { height: 65, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#fff', flexDirection: 'row', width: '100%' },
  navBarInteractiveControlTab: { flex: 1, alignItems: 'center', justifyContent: 'center' }
});
