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
  Switch,
  ActivityIndicator
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
  fullAddress: string;
  lat: string;
  lon: string;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'LOGIN' | 'OTP_CHECK' | 'DASHBOARD' | 'OFFER' | 'FIND'>('LOGIN');
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [globalLoading, setGlobalLoading] = useState(false);

  // Authentication states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginGender, setLoginGender] = useState('female');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [debugCodeHint, setDebugCodeHint] = useState('');

  // Dropdown Autocomplete suggestion states
  const [originSuggestions, setOriginSuggestions] = useState<SpatialSuggestion[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<SpatialSuggestion[]>([]);
  const [activeInputContext, setActiveInputContext] = useState<'OFFER_ORIGIN' | 'OFFER_DEST' | 'SEARCH_ORIGIN' | 'SEARCH_DEST' | null>(null);

  // Offer parameters
  const [offerOrigin, setOfferOrigin] = useState('');
  const [offerDestination, setOfferDestination] = useState('');
  const [offerTime, setOfferTime] = useState('');
  const [offerSeats, setOfferSeats] = useState('3');
  const [offerPrice, setOfferPrice] = useState('150');
  const [optSilent, setOptSilent] = useState(false);
  const [optWomenOnly, setOptWomenOnly] = useState(false);

  // Search variables
  const [searchOrigin, setSearchOrigin] = useState('');
  const [searchDestination, setSearchDestination] = useState('');
  const [searchResults, setSearchResults] = useState<RideMatch[]>([]);

  const API_URL = 'http://localhost:3000/api';

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
      console.log('Map server unreachable.');
    }
  };

  const handleSelectLocation = (item: SpatialSuggestion, context: 'OFFER_ORIGIN' | 'OFFER_DEST' | 'SEARCH_ORIGIN' | 'SEARCH_DEST') => {
    if (context === 'OFFER_ORIGIN') setOfferOrigin(item.displayName);
    if (context === 'OFFER_DEST') setOfferDestination(item.displayName);
    if (context === 'SEARCH_ORIGIN') setSearchOrigin(item.displayName);
    if (context === 'SEARCH_DEST') setSearchDestination(item.displayName);
    
    setOriginSuggestions([]);
    setDestSuggestions([]);
    setActiveInputContext(null);
  };

  const handleCorporateHandshake = async () => {
    if (!loginEmail || !loginName) {
      Alert.alert('Action Required', 'Please supply your operational name and corporate network address.');
      return;
    }
    setGlobalLoading(true);
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
      Alert.alert('Access Error', err.message || 'Verification initialization rejected.');
    } finally {
      setGlobalLoading(false);
    }
  };

  const verifyOtpTokenCode = async () => {
    if (!enteredOtp) return;
    setGlobalLoading(true);
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
      Alert.alert('Token Invalid', err.message || 'OTP check handshake failure.');
    } finally {
      setGlobalLoading(false);
    }
  };

  const dispatchOfferSubmission = async () => {
    if (!offerOrigin || !offerDestination || !offerTime) {
      Alert.alert('Details Missing', 'Please pin valid start and end path points.');
      return;
    }
    setGlobalLoading(true);
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
      Alert.alert('Route Registered', 'Your pool route has been successfully mapped out.');
      setCurrentScreen('DASHBOARD');
      // Reset inputs
      setOfferOrigin(''); setOfferDestination(''); setOfferTime('');
    } catch {
      Alert.alert('Error', 'Failed to upload route criteria metrics.');
    } finally {
      setGlobalLoading(false);
    }
  };

  const executeRouteSearchQuery = async () => {
    setGlobalLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/rides/search?origin=${encodeURIComponent(searchOrigin)}&destination=${encodeURIComponent(searchDestination)}&riderId=${currentUser?.id}`
      );
      const data = await response.json();
      setSearchResults(data.rides || []);
    } catch {
      Alert.alert('Search Offline', 'Could not index matching paths.');
    } finally {
      setGlobalLoading(false);
    }
  };

  const processBookingTransaction = async (rideId: string) => {
    setGlobalLoading(true);
    try {
      const response = await fetch(`${API_URL}/rides/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rideId, riderId: currentUser?.id })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      Alert.alert('Pact Confirmed!', `Seat reserved safely. Boarding Code: ${data.booking.verificationPasscode}`);
      setCurrentScreen('DASHBOARD');
    } catch (err: any) {
      Alert.alert('Booking Error', err.message || 'Transaction could not be initialized.');
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.appContainer}>
      {/* Top Banner Navigation Header */}
      <View style={styles.appHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.logoBadgeEmoji}>🤝</Text>
          <View>
            <Text style={styles.brandTitleText}>PACT</Text>
            <Text style={styles.subBrandTagline}>Enterprise Network Mesh</Text>
          </View>
        </View>
        {currentUser && (
          <View style={styles.userProfilePillBadge}>
            <Text style={styles.userBadgeTextText}>{currentUser.name}</Text>
            <Text style={styles.companySubLabel}>{currentUser.company}</Text>
          </View>
        )}
      </View>

      {/* Global Activity Loader */}
      {globalLoading && (
        <View style={styles.systemGlobalLoaderTrack}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.screenScrollLayout} keyboardShouldPersistTaps="handled">
        {currentScreen === 'LOGIN' && (
          <View style={styles.cardUIElement}>
            <Text style={styles.sectionHeaderLabelText}>Corporate Identity Authentication</Text>
            <Text style={styles.supportingHelperBodyText}>Access verification requires a valid, corporate enterprise email address.</Text>
            
            <Text style={styles.inputElementHeaderTitleLabel}>Legal Full Name</Text>
            <TextInput style={styles.formTextInputField} placeholder="e.g. Ramesh Kumar" placeholderTextColor="#9CA3AF" value={loginName} onChangeText={setLoginName} />
            
            <Text style={styles.inputElementHeaderTitleLabel}>Enterprise Email Domain Address</Text>
            <TextInput style={styles.formTextInputField} placeholder="e.g. ramesh@google.com" placeholderTextColor="#9CA3AF" value={loginEmail} onChangeText={setLoginEmail} autoCapitalize="none" keyboardType="email-address" />
            
            <Text style={styles.inputElementHeaderTitleLabel}>Select Profile Verification Track</Text>
            <View style={styles.segmentedTabContainerGroupRow}>
              <TouchableOpacity style={[styles.genderSelectChipTab, loginGender === 'female' && styles.genderSelectChipTabSelected]} onPress={() => setLoginGender('female')}>
                <Text style={loginGender === 'female' ? styles.chipTextSelected : styles.chipTextUnselected}>Female Route Preference</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.genderSelectChipTab, loginGender === 'male' && styles.genderSelectChipTabSelected]} onPress={() => setLoginGender('male')}>
                <Text style={loginGender === 'male' ? styles.chipTextSelected : styles.chipTextUnselected}>Standard General Route</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.actionExecutionButton} onPress={handleCorporateHandshake}>
              <Text style={styles.actionButtonLabelText}>Initialize Network Handshake</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentScreen === 'OTP_CHECK' && (
          <View style={styles.cardUIElement}>
            <Text style={styles.sectionHeaderLabelText}>Verify Security Token</Text>
            <Text style={styles.supportingHelperBodyText}>A security token payload handshake has been executed and logged inside the backend cluster module window.</Text>
            
            {debugCodeHint ? <View style={styles.debugTerminalCodeHint}><Text style={styles.debugTokenLabelTextText}>Bypass Pin: {debugCodeHint}</Text></View> : null}
            
            <Text style={styles.inputElementHeaderTitleLabel}>Enter 4-Digit Verification Key</Text>
            <TextInput style={[styles.formTextInputField, styles.otpCenterInputTextAlignment]} placeholder="0 0 0 0" placeholderTextColor="#6B7280" keyboardType="numeric" maxLength={4} value={enteredOtp} onChangeText={setEnteredOtp} />
            
            <TouchableOpacity style={styles.actionExecutionButton} onPress={verifyOtpTokenCode}>
              <Text style={styles.actionButtonLabelText}>Authenticate Profile Signature</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentScreen === 'DASHBOARD' && (
          <View style={{ width: '100%' }}>
            <View style={styles.greenMetricImpactContainerBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#E0F2FE', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 }}>CO₂ OFFSET MATRIX LAYER</Text>
                <Text style={styles.activeVerifiedStatusBadgeMarkerText}>Verified Profile Node</Text>
              </View>
              <Text style={{ color: '#fff', fontSize: 36, fontWeight: '800', marginVertical: 8 }}>14.2 kg</Text>
              <Text style={{ color: '#A7F3D0', fontSize: 13, fontWeight: '500' }}>Carbon Catalyst Tier Level: Silver Core</Text>
            </View>

            <Text style={styles.dashboardSectionBreakHeaderLabel}>Network Action Routing Panels</Text>
            <View style={styles.dashboardActionButtonsGroupContainer}>
              <TouchableOpacity style={styles.dashboardActionBigFunctionalMenuCardButton} onPress={() => { setSearchResults([]); setCurrentScreen('FIND'); }}>
                <Text style={styles.bigCardFunctionalMenuIconButtonEmoji}>🔍</Text>
                <Text style={styles.bigCardMainActionButtonTextLabel}>Find Commute</Text>
                <Text style={styles.bigCardSubDescriptionHelperText}>Scan matching verified corporate routes</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.dashboardActionBigFunctionalMenuCardButton, { backgroundColor: '#1E293B' }]} onPress={() => setCurrentScreen('OFFER')}>
                <Text style={styles.bigCardFunctionalMenuIconButtonEmoji}>🚗</Text>
                <Text style={styles.bigCardMainActionButtonTextLabel}>Offer Commute</Text>
                <Text style={styles.bigCardSubDescriptionHelperText}>Publish active available empty vehicle inventory</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {currentScreen === 'OFFER' && (
          <View style={styles.cardUIElement}>
            <Text style={styles.sectionHeaderLabelText}>Publish Active Pool Route</Text>
            <Text style={styles.supportingHelperBodyText}>Configure route bounds. System autocompletion scans Indian city data maps dynamically.</Text>
            
            <Text style={styles.inputElementHeaderTitleLabel}>Departure Origin Station Point</Text>
            <TextInput 
              style={styles.formTextInputField} 
              placeholder="e.g. Provident Kenworth..." 
              placeholderTextColor="#9CA3AF"
              value={offerOrigin} 
              onFocus={() => setActiveInputContext('OFFER_ORIGIN')}
              onChangeText={(t) => triggerLocationSearch(t, 'ORIGIN')} 
            />
            {activeInputContext === 'OFFER_ORIGIN' && originSuggestions.map((item, i) => (
              <TouchableOpacity key={i} style={styles.autocompleteSuggestionRowTouch} onPress={() => handleSelectLocation(item, 'OFFER_ORIGIN')}>
                <Text style={styles.autocompleteRowLabelText} numberOfLines={1}>📍 {item.displayName}</Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.inputElementHeaderTitleLabel}>Target Destination Base Terminal</Text>
            <TextInput 
              style={styles.formTextInputField} 
              placeholder="e.g. Gachibowli Tech Park..." 
              placeholderTextColor="#9CA3AF"
              value={offerDestination} 
              onFocus={() => setActiveInputContext('OFFER_DEST')}
              onChangeText={(t) => triggerLocationSearch(t, 'DEST')} 
            />
            {activeInputContext === 'OFFER_DEST' && destSuggestions.map((item, i) => (
              <TouchableOpacity key={i} style={styles.autocompleteSuggestionRowTouch} onPress={() => handleSelectLocation(item, 'OFFER_DEST')}>
                <Text style={styles.autocompleteRowLabelText} numberOfLines={1}>🏁 {item.displayName}</Text>
              </TouchableOpacity>
            ))}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputElementHeaderTitleLabel}>Departure Time</Text>
                <TextInput style={styles.formTextInputField} placeholder="09:00 AM" placeholderTextColor="#9CA3AF" value={offerTime} onChangeText={setOfferTime} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputElementHeaderTitleLabel}>Available Inventory</Text>
                <TextInput style={styles.formTextInputField} placeholder="Seats" placeholderTextColor="#9CA3AF" keyboardType="numeric" value={offerSeats} onChangeText={setOfferSeats} />
              </View>
            </View>

            <Text style={styles.inputElementHeaderTitleLabel}>Carpool Fare Splitting Value (INR)</Text>
            <TextInput style={styles.formTextInputField} placeholder="150" placeholderTextColor="#9CA3AF" keyboardType="numeric" value={offerPrice} onChangeText={setOfferPrice} />
            
            <View style={styles.toggleConstraintRowLayout}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.toggleElementLabelTitleText}>Request Silent Mode Commute</Text>
                <Text style={styles.toggleElementSubDescriptionHelperText}>No mandatory small talk interaction guidelines enforced.</Text>
              </View>
              <Switch value={optSilent} onValueChange={setOptSilent} trackColor={{ false: '#374151', true: '#10B981' }} />
            </View>

            <View style={styles.toggleConstraintRowLayout}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.toggleElementLabelTitleText}>Restrict Visibility to Women Only</Text>
                <Text style={styles.toggleElementSubDescriptionHelperText}>Limits map routing search listings visibility safely.</Text>
              </View>
              <Switch value={optWomenOnly} onValueChange={setOptWomenOnly} trackColor={{ false: '#374151', true: '#10B981' }} />
            </View>

            <TouchableOpacity style={styles.actionExecutionButton} onPress={dispatchOfferSubmission}>
              <Text style={styles.actionButtonLabelText}>Broadcast Carpool Route Asset</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentScreen === 'FIND' && (
          <View style={{ width: '100%' }}>
            <View style={styles.cardUIElement}>
              <Text style={styles.sectionHeaderLabelText}>Query Matching Active Commutes</Text>
              
              <Text style={styles.inputElementHeaderTitleLabel}>Pickup Point</Text>
              <TextInput 
                style={styles.formTextInputField} 
                placeholder="Where are you looking for a ride from?" 
                placeholderTextColor="#9CA3AF"
                value={searchOrigin} 
                onFocus={() => setActiveInputContext('SEARCH_ORIGIN')}
                onChangeText={(t) => triggerLocationSearch(t, 'ORIGIN')} 
              />
              {activeInputContext === 'SEARCH_ORIGIN' && originSuggestions.map((item, i) => (
                <TouchableOpacity key={i} style={styles.autocompleteSuggestionRowTouch} onPress={() => handleSelectLocation(item, 'SEARCH_ORIGIN')}>
                  <Text style={styles.autocompleteRowLabelText} numberOfLines={1}>📍 {item.displayName}</Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.inputElementHeaderTitleLabel}>Drop Point Target</Text>
              <TextInput 
                style={styles.formTextInputField} 
                placeholder="Where is your target destination office?" 
                placeholderTextColor="#9CA3AF"
                value={searchDestination} 
                onFocus={() => setActiveInputContext('SEARCH_DEST')}
                onChangeText={(t) => triggerLocationSearch(t, 'DEST')} 
              />
              {activeInputContext === 'SEARCH_DEST' && destSuggestions.map((item, i) => (
                <TouchableOpacity key={i} style={styles.autocompleteSuggestionRowTouch} onPress={() => handleSelectLocation(item, 'SEARCH_DEST')}>
                  <Text style={styles.autocompleteRowLabelText} numberOfLines={1}>🏁 {item.displayName}</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity style={[styles.actionExecutionButton, { backgroundColor: '#10B981' }]} onPress={executeRouteSearchQuery}>
                <Text style={styles.actionButtonLabelText}>Scan Intersecting Grid Metrics</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.dashboardSectionBreakHeaderLabel}>Available Active Encrypted Routes ({searchResults.length})</Text>

            {searchResults.map((ride) => (
              <View key={ride.id} style={styles.matchListingResultCardBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={styles.matchCardDriverNameTextText}>{ride.driverName}</Text>
                    <Text style={styles.matchCardCorporateNetworkLabelText}>Corporate Node: <Text style={{ color: '#10B981', fontWeight: '700' }}>{ride.company}</Text></Text>
                  </View>
                  <Text style={styles.matchCardPriceFareLabelText}>₹{ride.price}</Text>
                </View>
                
                <View style={styles.matchCardRouteTimelineSpliceBorderLayoutContainer}>
                  <Text style={styles.matchCardRouteAddressDetailsTextLabel} numberOfLines={1}>📍 <Text style={{ fontWeight: '600' }}>From:</Text> {ride.origin}</Text>
                  <Text style={styles.matchCardRouteAddressDetailsTextLabel} numberOfLines={1}>🏁 <Text style={{ fontWeight: '600' }}>To:</Text> {ride.destination}</Text>
                </View>

                <Text style={styles.departureDeltaLabelTextText}>🕒 Target Window: {ride.departureTime} (Route Delta deviation: {ride.deviationMinutes} mins)</Text>
                
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 10 }}>
                  {ride.silentRide && <View style={styles.preferenceMetaBadgeContainer}><Text style={styles.preferenceMetaBadgeTextText}>🔇 Silent Request</Text></View>}
                  {ride.sharesCorporateNetwork && <View style={[styles.preferenceMetaBadgeContainer, { backgroundColor: '#064E3B' }]}><Text style={[styles.preferenceMetaBadgeTextText, { color: '#A7F3D0' }]}>🏢 Shared Cluster Match</Text></View>}
                  <View style={[styles.preferenceMetaBadgeContainer, { backgroundColor: '#1E293B' }]}><Text style={[styles.preferenceMetaBadgeTextText, { color: '#9CA3AF' }]}>💺 {ride.availableSeats} Available Seats</Text></View>
                </View>

                <TouchableOpacity style={styles.actionSecureBookingDirectButtonComponent} onPress={() => processBookingTransaction(ride.id)}>
                  <Text style={styles.actionButtonLabelText}>Secure Booking Agreement</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer Navigation Control System */}
      {currentScreen !== 'LOGIN' && currentScreen !== 'OTP_CHECK' && (
        <View style={styles.footerNavigationControlBar}>
          <TouchableOpacity onPress={() => setCurrentScreen('DASHBOARD')} style={[styles.navBarInteractiveControlTab, currentScreen === 'DASHBOARD' && styles.navBarInteractiveControlTabActive]}>
            <Text style={[styles.navBarTextLabelStyleElement, currentScreen === 'DASHBOARD' && { color: '#10B981' }]}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setCurrentResults([]); setCurrentScreen('FIND'); }} style={[styles.navBarInteractiveControlTab, currentScreen === 'FIND' && styles.navBarInteractiveControlTabActive]}>
            <Text style={[styles.navBarTextLabelStyleElement, currentScreen === 'FIND' && { color: '#10B981' }]}>Find Rides</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCurrentScreen('OFFER')} style={[styles.navBarInteractiveControlTab, currentScreen === 'OFFER' && styles.navBarInteractiveControlTabActive]}>
            <Text style={[styles.navBarTextLabelStyleElement, currentScreen === 'OFFER' && { color: '#10B981' }]}>Offer Ride</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setCurrentUser(null); setCurrentScreen('LOGIN'); }} style={styles.navBarInteractiveControlTab}>
            <Text style={[styles.navBarTextLabelStyleElement, { color: '#EF4444' }]}>Exit Grid</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appContainer: { flex: 1, backgroundColor: '#0B0F19' },
  appHeader: { height: 70, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B', backgroundColor: '#111827', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoBadgeEmoji: { fontSize: 24, marginRight: 10 },
  brandTitleText: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 1.5 },
  subBrandTagline: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  userProfilePillBadge: { alignItems: 'flex-end', backgroundColor: '#1E293B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  userBadgeTextText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  companySubLabel: { fontSize: 9, fontWeight: '800', color: '#10B981' },
  systemGlobalLoaderTrack: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,15,25,0.7)', zIndex: 999, justifyContent: 'center', alignItems: 'center' },
  screenScrollLayout: { padding: 20, alignItems: 'center' },
  cardUIElement: { width: '100%', backgroundColor: '#111827', padding: 24, borderRadius: 20, borderWidth: 1, borderColor: '#1E293B', marginBottom: 20 },
  sectionHeaderLabelText: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8, letterSpacing: -0.3 },
  supportingHelperBodyText: { fontSize: 13, color: '#9CA3AF', marginBottom: 20, lineHeight: 19 },
  inputElementHeaderTitleLabel: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  formTextInputField: { width: '100%', height: 48, borderWidth: 1, borderColor: '#1E293B', borderRadius: 12, paddingHorizontal: 16, marginBottom: 16, backgroundColor: '#1E293B', fontSize: 14, color: '#fff' },
  otpCenterInputTextAlignment: { textAlign: 'center', fontSize: 24, fontWeight: '800', letterSpacing: 8, color: '#10B981', height: 60 },
  autocompleteSuggestionRowTouch: { width: '100%', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#1E293B', backgroundColor: '#1F2937', borderRadius: 8, marginBottom: 4 },
  autocompleteRowLabelText: { fontSize: 13, color: '#E5E7EB' },
  segmentedTabContainerGroupRow: { flexDirection: 'row', gap: 10, marginVertical: 14, width: '100%' },
  genderSelectChipTab: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1E293B', backgroundColor: '#1E293B', alignItems: 'center' },
  genderSelectChipTabSelected: { backgroundColor: '#10B981', borderColor: '#10B981' },
  chipTextSelected: { color: '#fff', fontWeight: '800', fontSize: 13 },
  chipTextUnselected: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
  actionExecutionButton: { width: '100%', backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  actionButtonLabelText: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.3 },
  debugTerminalCodeHint: { backgroundColor: 'rgba(245,158,11,0.1)', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  debugTokenLabelTextText: { color: '#F59E0B', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  greenMetricImpactContainerBox: { width: '100%', backgroundColor: '#065F46', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#047857' },
  activeVerifiedStatusBadgeMarkerText: { fontSize: 10, fontWeight: '800', color: '#A7F3D0', backgroundColor: '#047857', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  dashboardSectionBreakHeaderLabel: { width: '100%', fontSize: 14, fontWeight: '800', color: '#9CA3AF', marginTop: 24, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.8 },
  dashboardActionButtonsGroupContainer: { flexDirection: 'row', gap: 14, width: '100%' },
  dashboardActionBigFunctionalMenuCardButton: { flex: 1, backgroundColor: '#10B981', padding: 20, borderRadius: 20, minHeight: 150, justifyContent: 'space-between' },
  bigCardFunctionalMenuIconButtonEmoji: { fontSize: 28 },
  bigCardMainActionButtonTextLabel: { fontSize: 16, fontWeight: '800', color: '#fff', marginTop: 12 },
  bigCardSubDescriptionHelperText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4, lineHeight: 14 },
  toggleConstraintRowLayout: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1E293B', marginBottom: 8 },
  toggleElementLabelTitleText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  toggleElementSubDescriptionHelperText: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  matchListingResultCardBox: { width: '100%', backgroundColor: '#111827', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#1E293B', marginBottom: 16 },
  matchCardDriverNameTextText: { fontWeight: '800', fontSize: 18, color: '#fff' },
  matchCardCorporateNetworkLabelText: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  matchCardPriceFareLabelText: { fontWeight: '900', color: '#10B981', fontSize: 20 },
  matchCardRouteTimelineSpliceBorderLayoutContainer: { marginVertical: 12, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: '#334155' },
  matchCardRouteAddressDetailsTextLabel: { color: '#E5E7EB', fontSize: 13, marginVertical: 3 },
  departureDeltaLabelTextText: { fontSize: 12, fontWeight: '600', color: '#60A5FA', backgroundColor: 'rgba(96,165,250,0.1)', padding: 8, borderRadius: 8, overflow: 'hidden' },
  preferenceMetaBadgeContainer: { backgroundColor: '#1E293B', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  preferenceMetaBadgeTextText: { fontSize: 11, fontWeight: '700', color: '#E5E7EB' },
  actionSecureBookingDirectButtonComponent: { width: '100%', backgroundColor: '#1E293B', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 6, borderWidth: 1, borderColor: '#334155' },
  footerNavigationControlBar: { height: 75, borderTopWidth: 1, borderTopColor: '#1E293B', backgroundColor: '#111827', flexDirection: 'row', width: '100%' },
  navBarInteractiveControlTab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 10 },
  navBarInteractiveControlTabActive: { borderTopWidth: 2, borderTopColor: '#10B981' },
  navBarTextLabelStyleElement: { fontSize: 11, fontWeight: '700', color: '#9CA3AF' }
});
