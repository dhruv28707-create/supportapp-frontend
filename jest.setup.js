/* eslint-env jest */
/**
 * Jest setup — mocks native modules that cannot run in a Node test env.
 */

jest.mock('@react-native-firebase/auth', () => {
  const mockUser = {
    uid: 'test-uid',
    email: 'test@example.com',
    displayName: 'Test User',
    getIdToken: jest.fn(async () => 'fake-id-token'),
  };
  const mockAuth = {
    currentUser: mockUser,
    onAuthStateChanged: jest.fn(() => jest.fn()),
    signInWithEmailAndPassword: jest.fn(async () => ({ user: mockUser })),
    createUserWithEmailAndPassword: jest.fn(async () => ({ user: mockUser })),
    signInWithCredential: jest.fn(async () => ({ user: mockUser })),
    signOut: jest.fn(async () => {}),
    GoogleAuthProvider: { credential: jest.fn(() => ({ idToken: 'x' })) },
  };
  return { __esModule: true, default: jest.fn(() => mockAuth) };
});

jest.mock('@react-native-firebase/firestore', () => {
  const makeDoc = () => ({
    get: jest.fn(async () => ({ exists: false, data: () => ({}) })),
    set: jest.fn(async () => {}),
    delete: jest.fn(async () => {}),
    collection: jest.fn(() => makeCollection()),
  });
  const makeCollection = () => ({
    doc: jest.fn(() => makeDoc()),
    get: jest.fn(async () => ({ docs: [] })),
    orderBy: jest.fn(() => ({ onSnapshot: jest.fn(() => jest.fn()) })),
    onSnapshot: jest.fn(() => jest.fn()),
  });
  const firestoreMock = jest.fn(() => ({
    collection: jest.fn(() => makeCollection()),
    batch: jest.fn(() => ({ delete: jest.fn(), commit: jest.fn(async () => {}) })),
  }));
  firestoreMock.FieldValue = {
    serverTimestamp: jest.fn(() => new Date()),
    increment: jest.fn((n) => n),
  };
  return { __esModule: true, default: firestoreMock };
});

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(async () => ({ data: { idToken: 'fake-google-token' } })),
  },
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' },
}));

jest.mock('react-native-razorpay', () => ({
  __esModule: true,
  default: { open: jest.fn(async () => ({})) },
}));

// The native animated driver is unavailable in Node. In RN 0.82 the
// NativeAnimatedModule registry lookups resolve to null, which makes any
// component using useNativeDriver crash in tests. Stub both the classic and
// turbo modules (the helper picks whichever is non-null) so native-driven
// animations become no-ops.
const mockNativeAnimatedStub = () => {
  const methodNames = [
    'startOperationBatch',
    'finishOperationBatch',
    'createAnimatedNode',
    'updateAnimatedNodeConfig',
    'getValue',
    'startListeningToAnimatedNodeValue',
    'stopListeningToAnimatedNodeValue',
    'connectAnimatedNodes',
    'disconnectAnimatedNodes',
    'startAnimatingNode',
    'stopAnimation',
    'setAnimatedNodeValue',
    'setAnimatedNodeOffset',
    'flattenAnimatedNodeOffset',
    'extractAnimatedNodeOffset',
    'connectAnimatedNodeToView',
    'disconnectAnimatedNodeFromView',
    'restoreDefaultValues',
    'dropAnimatedNode',
    'addAnimatedEventToView',
    'removeAnimatedEventFromView',
    'addListener',
    'removeListeners',
    'queueAndExecuteBatchedOperations',
  ];
  const stub = {};
  methodNames.forEach((name) => {
    stub[name] = jest.fn();
  });
  stub.getValue = jest.fn((tag, cb) => cb && cb(0));
  stub.getConstants = jest.fn(() => ({}));
  return { __esModule: true, default: stub };
};

jest.mock('react-native/Libraries/Animated/NativeAnimatedModule', () => mockNativeAnimatedStub());
jest.mock('react-native/Libraries/Animated/NativeAnimatedTurboModule', () => mockNativeAnimatedStub());

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: (props) => React.createElement(View, props),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaInsetsContext: React.createContext(null),
  };
});
