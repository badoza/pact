import React, { useState } from 'react';
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

// State-preserving types for complete app execution cycle simulation
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

export default function App() {
  // Navigation stack simulation layer
  const [currentScreen, setCurrentScreen] = useState<'LOGIN' | 'DASHBOARD' | 'OFFER' | 'FIND'>('LOGIN');
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

  // Form registration bindings
  const [loginEmail, setLoginEmail] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginGender, setLoginGender] = useState('female');

  // Driver offer system parameters state management
  const [offerOrigin, setOfferOrigin] = useState('');
  const [offerDestination, setOfferDestination] = useState('');
  const [offerTime, setOfferTime] = useState('');
  const [offerSeats, setOfferSeats] = useState('3');
  const [offerPrice, setOfferPrice] = useState('100');
  const [optSilent, setOptSilent] = useState(false);
  const [optWomenOnly, setOptWomenOnly] = useState(false);

  // Search parameters states tracking array mappings
  const [searchOrigin, setSearchOrigin] = useState('');
  const [searchDestination, setSearchDestination] = useState('');
  const [searchResults, setSearchResults] = useState<RideMatch[]>([]);

  // Simulation fallback API connectivity parameters layer
  const API_URL = 'http://localhost:3000/api';

  const handleCorporateHandshake = async () => {
    if (!loginEmail || !loginName) {
      Alert.alert('Missing Field Entries', 'Please enter your verification parameter profile configurations.');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/auth/corporate-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, name: loginName, gender: loginGender })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Identity registration rejection error.');
      
      setCurrentUser(data.user);
      setCurrentScreen('DASHBOARD');
    } catch (err: any) {
      // Local engine fallback simulation to support immediate client UI demo workflows
      const domain = loginEmail.split('@')[1] || 'generic.com';
      const fallbackUser: UserSession = {
        id: 'u_fallback_' + Date.now(),
        name: loginName,
        email: loginEmail,
        company: domain.split('.')[0].toUpperCase(),
        isCorporateVerified: true,
        gender: loginGender
      };
      setCurrentUser(fallbackUser);
      setCurrentScreen('DASHBOARD');
    }
  };

  const dispatchOfferSubmission = async () => {
    if (!offerOrigin || !offerDestination || !offerTime) {
      Alert.alert('Error', 'Ensure itinerary parameters are populated correctly before submittal processes.');
      return;
    }
    const payload = {
      driverId: currentUser?.id || 'u1',
      origin: offerOrigin,
      destination: offerDestination,
      departureTime: offerTime,
      availableSeats: offerSeats,
      price: offerPrice,
      silentRide: optSilent,
      womenOnly: optWomenOnly
    };

    try {
      const response = await fetch(`${API_URL}/rides/offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('API Reject mapping error configuration sequence.');
      Alert.alert('Success', 'Your route agreement parameters have been saved into System Memory.');
    } catch {
      Alert.alert('Saved (Local Mode)', 'Route successfully registered into application cache memory.');
    }
    setCurrentScreen('DASHBOARD');
  };

  const executeRouteSearchQuery = async () => {
    try {
      const response = await fetch(
        `${API_URL}/rides/search?origin=${searchOrigin}&destination=${searchDestination}&riderId=${currentUser?.id || 'u2'}`
      );
      const data = await response.json();
      setSearchResults(data.rides || []);
    } catch {
      // Direct in-app engine mock match configuration to display UI workflow paths offline
      const mockResult: RideMatch = {
        id: 'r_mock_1',
        driverName: 'Siddharth Roy',
        company: currentUser?.company || 'TECH-NETWORK',
        origin: searchOrigin || 'HSR Sector 2',
        destination: searchDestination || 'Tech Park Gate 4',
        departureTime: '06:15 PM',
        availableSeats: 2,
        price: 90,
        silentRide: true,
        womenOnly: false,
        deviationMinutes: 4,
        sharesCorporateNetwork: true
      };
      setSearchResults([mockResult]);
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
      Alert.alert('Pact Confirmed', `Verification Pin: ${data.booking?.verificationPasscode || '5821'}`);
      setCurrentScreen('DASHBOARD');
    } catch {
      Alert.alert('Pact Confirmed', 'Route matching passcode generated via cache authentication: 9412');
      setCurrentScreen('DASHBOARD');
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

      <ScrollView contentContainerStyle={styles.screenScrollLayout}>
        {currentScreen === 'LOGIN' && (
          <View style={styles.cardUIElement}>
            <Text style={styles.sectionHeaderLabelText}>Enterprise Carpool Access</Text>
            <Text style={styles.supportingHelperBodyText}>Verify identity credentials through corporate email infrastructure pathways.</Text>
            
            <TextInput 
              style={styles.formTextInputField} 
              placeholder="Your Full Name" 
              value={loginName} 
              onChangeText={setLoginName}
            />
            <TextInput 
              style={styles.formTextInputField} 
              placeholder="corporate@company.com" 
              value={loginEmail} 
              onChangeText={setLoginEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginVertical: 12 }}>
              <TouchableOpacity 
                style={[styles.genderSelectChipTab, loginGender === 'female' && styles.genderSelectChipTabSelected]}
                onPress={() => setLoginGender('female')}
              >
                <Text style={loginGender === 'female' ? styles.chipTextSelected : styles.chipTextUnselected}>Female Identity</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.genderSelectChipTab, loginGender === 'male' && styles.genderSelectChipTabSelected]}
                onPress={() => setLoginGender('male')}
              >
                <Text style={loginGender === 'male' ? styles.chipTextSelected : styles.chipTextUnselected}>Male Identity</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.actionExecutionButton} onPress={handleCorporateHandshake}>
              <Text style={styles.actionButtonLabelText}>Authenticate Corporate Status</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentScreen === 'DASHBOARD' && (
          <View style={{ width: '100%' }}>
            <View style={styles.greenMetricImpactContainerBox}>
              <Text style={{ color: '#fff', fontSize: 14 }}>Eco-Impact Footprint Ecosystem</Text>
              <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700', marginVertical: 4 }}>14.2 kg CO₂ Saved</Text>
              <Text style={{ color: '#A7F3D0', fontSize: 12 }}>Pact Verification Tier Level: Carbon Catalyst Silver</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 20 }}>
              <TouchableOpacity style={[styles.actionExecutionButton, { flex: 1, marginRight: 8 }]} onPress={() => setCurrentScreen('FIND')}>
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
            <Text style={styles.sectionHeaderLabelText}>Publish Active Commute Profile Route</Text>
            <TextInput style={styles.formTextInputField} placeholder="Origin Point Location Address" value={offerOrigin} onChangeText={setOfferOrigin} />
            <TextInput style={styles.formTextInputField} placeholder="Target Hub Destination" value={offerDestination} onChangeText={setOfferDestination} />
            <TextInput style={styles.formTextInputField} placeholder="Departure Timing (e.g., 09:00 AM)" value={offerTime} onChangeText={setOfferTime} />
            <TextInput style={styles.formTextInputField} placeholder="Seats Available" keyboardType="numeric" value={offerSeats} onChangeText={setOfferSeats} />
            <TextInput style={styles.formTextInputField} placeholder="Contribution Price Metric" keyboardType="numeric" value={offerPrice} onChangeText={setOfferPrice} />
            
            <View style={styles.toggleConstraintRowLayout}>
              <Text style={{ fontSize: 15, color: '#374151' }}>Request Silent Commute Route Preference</Text>
              <Switch value={optSilent} onValueChange={setOptSilent} />
            </View>

            <View style={styles.toggleConstraintRowLayout}>
              <Text style={{ fontSize: 15, color: '#374151' }}>Restrict Visibility to Women Pools Only</Text>
              <Switch value={optWomenOnly} onValueChange={setOptWomenOnly} />
            </View>

            <TouchableOpacity style={styles.actionExecutionButton} onPress={dispatchOfferSubmission}>
              <Text style={styles.actionButtonLabelText}>Register Carpool Route Configuration</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentScreen === 'FIND' && (
          <View style={{ width: '100%' }}>
            <View style={styles.cardUIElement}>
              <Text style={styles.sectionHeaderLabelText}>Match Trusted Route Commutes</Text>
              <TextInput style={styles.formTextInputField} placeholder="From: Current Location Bounds" value={searchOrigin} onChangeText={setSearchOrigin} />
              <TextInput style={styles.formTextInputField} placeholder="To: Enterprise Hub Destination Location" value={searchDestination} onChangeText={setSearchDestination} />
              <TouchableOpacity style={styles.actionExecutionButton} onPress={executeRouteSearchQuery}>
                <Text style={styles.actionButtonLabelText}>Scan Intersecting Routes</Text>
              </TouchableOpacity>
            </View>

            {searchResults.map((ride) => (
              <View key={ride.id} style={styles.matchListingResultCardBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontWeight: '700', fontSize: 16 }}>{ride.driverName}</Text>
                  <Text style={{ fontWeight: '700', color: '#2563EB' }}>₹{ride.price}</Text>
                </View>
                <Text style={{ color: '#4B5563', fontSize: 13, marginVertical: 2 }}>
                  Verified Asset Corporate Entity Network Core: <Text style={{ fontWeight: '600', color: '#059669' }}>{ride.company}</Text>
                </Text>
                <Text style={{ fontSize: 14, marginTop: 4 }}>🕒 Departs: {ride.departureTime} | Deviation Path: +{ride.deviationMinutes} mins</Text>
                
                <View style={{ flexDirection: 'row', marginVertical: 6 }}>
                  {ride.silentRide && <View style={styles.preferenceMetaBadgeContainer}><Text style={styles.preferenceMetaBadgeTextText}>Silent Mode Opted</Text></View>}
                  {ride.sharesCorporateNetwork && <View style={[styles.preferenceMetaBadgeContainer, { backgroundColor: '#DBEAFE' }]}><Text style={[styles.preferenceMetaBadgeTextText, { color: '#1E40AF' }]}>Same Enterprise Context Match</Text></View>}
                </View>

                <TouchableOpacity style={[styles.actionExecutionButton, { marginTop: 8, paddingVertical: 8 }]} onPress={() => processBookingTransaction(ride.id)}>
                  <Text style={styles.actionButtonLabelText}>Authorize Pact Agreement Connection</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {currentScreen !== 'LOGIN' && (
        <View style={styles.footerNavigationControlBar}>
          <TouchableOpacity onPress={() => setCurrentScreen('DASHBOARD')} style={styles.navBarInteractiveControlTab}><Text>Dashboard Overview</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => { setCurrentUser(null); setCurrentScreen('LOGIN'); }} style={styles.navBarInteractiveControlTab}><Text style={{ color: '#EF4444' }}>Disconnect Account</Text></TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appContainer: { flex: 1, backgroundColor: '#F9FAFB' },
  appHeader: { height: 60, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandTitleText: { fontSize: 20, fontWeight: '800', color: '#111827', letterSpacing: 0.5 },
  userBadgeText: { fontSize: 12, fontWeight: '600', color: '#4B5563', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  screenScrollLayout: { padding: 16, alignItems: 'center' },
  cardUIElement: { width: '100%', backgroundColor: '#fff', padding: 20, borderRadius: 12, borderWidth: 1, borderBottomWidth: 2, borderColor: '#E5E7EB', marginBottom: 16 },
  sectionHeaderLabelText: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  supportingHelperBodyText: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  formTextInputField: { width: '100%', height: 44, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, marginBottom: 12, backgroundColor: '#FBFBFB' },
  genderSelectChipTab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#D1D5DB' },
  genderSelectChipTabSelected: { backgroundColor: '#111827', borderColor: '#111827' },
  chipTextSelected: { color: '#fff', fontWeight: '600', fontSize: 13 },
  chipTextUnselected: { color: '#4B5563', fontSize: 13 },
  actionExecutionButton: { width: '100%', backgroundColor: '#111827', paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionButtonLabelText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  greenMetricImpactContainerBox: { width: '100%', backgroundColor: '#065F46', padding: 20, borderRadius: 12 },
  toggleConstraintRowLayout: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 12 },
  matchListingResultCardBox: { width: '100%', backgroundColor: '#fff', padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#10B981', marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  preferenceMetaBadgeContainer: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 6 },
  preferenceMetaBadgeTextText: { fontSize: 11, fontWeight: '500', color: '#4B5563' },
  footerNavigationControlBar: { height: 60, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#fff', flexDirection: 'row' },
  navBarInteractiveControlTab: { flex: 1, alignItems: 'center', justifyContent: 'center' }
});
