import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useToken } from '../context/TokenContext';
import DeveloperBadge from '../components/DeveloperBadge';
import { colors } from '../theme';
import {
  DeveloperApiError,
  DeveloperCollection,
  fetchDeveloperCollectionDocs,
  fetchDeveloperCollections,
  fetchDeveloperOverview,
  fetchDeveloperProviderUsage,
  fetchDeveloperUser,
  fetchDeveloperUsers,
} from '../services/developerApi';

type DeveloperNavProp = NativeStackNavigationProp<RootStackParamList>;

type TabKey = 'overview' | 'users' | 'database' | 'providers';

const MONO_FONT = Platform.select({ ios: 'Menlo', default: 'monospace' });

const TABS: { id: TabKey; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'database', label: 'Database' },
  { id: 'providers', label: 'Providers' },
];

const USER_DETAIL_SECTIONS: { label: string; keys: string[] }[] = [
  { keys: ['auth', 'authRecord', 'authUser', 'record'], label: 'Auth record' },
  { keys: ['profile', 'userProfile', 'user'], label: 'Profile' },
  { keys: ['subscription', 'subscriptionInfo'], label: 'Subscription' },
  { keys: ['effectivePlan', 'plan', 'planInfo'], label: 'Effective plan' },
  { keys: ['recentPayments', 'payments', 'recentPayment'], label: 'Recent payments' },
];

const PROVIDER_ALIASES: Record<string, string[]> = {
  openrouter: ['openrouter', 'openRouter', 'OpenRouter'],
  groq: ['groq', 'Groq'],
  razorpay: ['razorpay', 'Razorpay'],
};

const PROVIDER_FIELDS: Record<string, { label: string; keys: string[] }[]> = {
  openrouter: [
    { label: 'Usage', keys: ['usage', 'used', 'usageUsd', 'totalUsage', 'total_usage'] },
    { label: 'Limit', keys: ['limit', 'usageLimit', 'limitUsd', 'totalLimit'] },
    { label: 'Remaining', keys: ['remaining', 'remainingCredits', 'remainingUsd', 'remaining_credits'] },
    { label: 'Free tier', keys: ['freeTier', 'isFreeTier', 'free_tier'] },
    { label: 'Rate limit', keys: ['rateLimit', 'rate_limit', 'rateLimits'] },
    { label: 'Errors', keys: ['errors', 'error'] },
  ],
  groq: [
    { label: 'Configured', keys: ['configured', 'isConfigured', 'enabled'] },
    { label: 'Model', keys: ['model', 'defaultModel', 'default_model'] },
  ],
  razorpay: [
    { label: 'Configured', keys: ['configured', 'isConfigured', 'enabled'] },
    { label: 'Mode', keys: ['mode', 'environment', 'liveMode', 'live'] },
  ],
};

function pickField(obj: any, keys: string[]): any {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function displayValue(value: any): string {
  if (value === undefined) return '—';
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function humanize(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/^\w/, (c) => c.toUpperCase());
}

function JsonView({ value }: { value: any }) {
  let text: string;
  try {
    text = JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    text = String(value);
  }
  return (
    <Text style={styles.json} selectable>
      {text}
    </Text>
  );
}

function SectionCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: any;
  tone?: 'danger';
}) {
  return (
    <View style={[styles.card, tone === 'danger' && styles.cardDanger]}>
      <Text style={[styles.cardHeading, tone === 'danger' && styles.cardHeadingDanger]}>
        {title}
      </Text>
      <JsonView value={value} />
    </View>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.centerText}>{label}</Text>
    </View>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.85}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function DeveloperScreen() {
  const navigation = useNavigation<DeveloperNavProp>();
  const { isDeveloper, refreshDeveloperAccess } = useToken();

  const [tab, setTab] = useState<TabKey>('overview');
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const accessAttempted = useRef(false);
  const developerOnlyHandled = useRef(false);

  const [refreshing, setRefreshing] = useState(false);

  const [overview, setOverview] = useState<any>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const overviewStarted = useRef(false);

  const [users, setUsers] = useState<any[]>([]);
  const [usersToken, setUsersToken] = useState<string | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<any>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [userDetailError, setUserDetailError] = useState<string | null>(null);

  const [collectionList, setCollectionList] = useState<DeveloperCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);
  const [collectionsError, setCollectionsError] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [uidFilter, setUidFilter] = useState('');
  const [appliedUid, setAppliedUid] = useState('');
  const [docs, setDocs] = useState<any[]>([]);
  const [docsCursor, setDocsCursor] = useState<string | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsLoaded, setDocsLoaded] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);

  const [providerUsage, setProviderUsage] = useState<any>(null);
  const [providerLoading, setProviderLoading] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);

  const handleDeveloperOnly = useCallback(async () => {
    if (developerOnlyHandled.current) return;
    developerOnlyHandled.current = true;
    setAccessDenied(true);
    const fresh = await refreshDeveloperAccess().catch(() => null);
    if (!fresh?.isDeveloper) {
      navigation.goBack();
    } else {
      setAccessDenied(false);
      developerOnlyHandled.current = false;
    }
  }, [navigation, refreshDeveloperAccess]);

  const describeError = useCallback(
    (e: any): string => {
      if (e instanceof DeveloperApiError && e.status === 403 && e.code === 'developer_only') {
        handleDeveloperOnly();
        return 'Developer access is no longer available.';
      }
      if (e?.name === 'ApiError' && e?.status === 401) {
        return 'Your session expired. Please sign in again.';
      }
      return e?.message || 'Something went wrong.';
    },
    [handleDeveloperOnly],
  );

  // If a non-developer somehow reaches this route (or access was revoked while
  // open), force one token refresh + plan read. Never loops.
  useEffect(() => {
    if (isDeveloper) {
      setAccessChecked(true);
      return;
    }
    if (accessAttempted.current) {
      setAccessChecked(true);
      return;
    }
    accessAttempted.current = true;
    let mounted = true;
    refreshDeveloperAccess()
      .catch(() => {})
      .finally(() => {
        if (mounted) setAccessChecked(true);
      });
    return () => {
      mounted = false;
    };
  }, [isDeveloper, refreshDeveloperAccess]);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      setOverview(await fetchDeveloperOverview());
    } catch (e: any) {
      setOverviewError(describeError(e));
    } finally {
      setOverviewLoading(false);
    }
  }, [describeError]);

  const loadUsers = useCallback(
    async (reset: boolean) => {
      setUsersLoading(true);
      setUsersError(null);
      try {
        const page = await fetchDeveloperUsers(25, reset ? null : usersToken);
        setUsers((prev) => (reset ? page.items : [...prev, ...page.items]));
        setUsersToken(page.nextPageToken);
        setUsersLoaded(true);
      } catch (e: any) {
        setUsersError(describeError(e));
      } finally {
        setUsersLoading(false);
      }
    },
    [describeError, usersToken],
  );

  const openUser = useCallback(
    async (uid: string) => {
      if (!uid) return;
      setSelectedUid(uid);
      setUserDetail(null);
      setUserDetailError(null);
      setUserDetailLoading(true);
      try {
        setUserDetail(await fetchDeveloperUser(uid));
      } catch (e: any) {
        setUserDetailError(describeError(e));
      } finally {
        setUserDetailLoading(false);
      }
    },
    [describeError],
  );

  const loadCollections = useCallback(async () => {
    setCollectionsLoading(true);
    setCollectionsError(null);
    try {
      setCollectionList(await fetchDeveloperCollections());
      setCollectionsLoaded(true);
    } catch (e: any) {
      setCollectionsError(describeError(e));
    } finally {
      setCollectionsLoading(false);
    }
  }, [describeError]);

  const loadDocs = useCallback(
    async (collection: string, reset: boolean, uid: string, cursor: string | null) => {
      setDocsLoading(true);
      setDocsError(null);
      try {
        const page = await fetchDeveloperCollectionDocs(collection, {
          limit: 25,
          uid,
          cursor: reset ? null : cursor,
        });
        setDocs((prev) => (reset ? page.items : [...prev, ...page.items]));
        setDocsCursor(page.nextPageToken);
        setDocsLoaded(true);
      } catch (e: any) {
        setDocsError(describeError(e));
      } finally {
        setDocsLoading(false);
      }
    },
    [describeError],
  );

  const loadProviderUsage = useCallback(async () => {
    setProviderLoading(true);
    setProviderError(null);
    try {
      setProviderUsage(await fetchDeveloperProviderUsage());
    } catch (e: any) {
      setProviderError(describeError(e));
    } finally {
      setProviderLoading(false);
    }
  }, [describeError]);

  const openCollection = useCallback(
    (name: string) => {
      setSelectedCollection(name);
      setDocs([]);
      setDocsCursor(null);
      setDocsLoaded(false);
      setDocsError(null);
      loadDocs(name, true, appliedUid, null);
    },
    [appliedUid, loadDocs],
  );

  const applyUidFilter = useCallback(() => {
    const next = uidFilter.trim();
    setAppliedUid(next);
    if (selectedCollection) {
      setDocs([]);
      setDocsCursor(null);
      setDocsLoaded(false);
      loadDocs(selectedCollection, true, next, null);
    }
  }, [loadDocs, selectedCollection, uidFilter]);

  const selectTab = useCallback(
    (next: TabKey) => {
      setTab(next);
      setSelectedUid(null);
      if (next === 'users' && !usersLoaded && !usersLoading) loadUsers(true);
      if (next === 'database' && !collectionsLoaded && !collectionsLoading) loadCollections();
      if (next === 'providers' && providerUsage === null && !providerLoading) loadProviderUsage();
    },
    [
      collectionsLoaded,
      collectionsLoading,
      loadCollections,
      loadProviderUsage,
      loadUsers,
      providerLoading,
      providerUsage,
      usersLoaded,
      usersLoading,
    ],
  );

  useEffect(() => {
    if (!isDeveloper || overviewStarted.current) return;
    overviewStarted.current = true;
    loadOverview();
  }, [isDeveloper, loadOverview]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (tab === 'overview') await loadOverview();
      else if (tab === 'users') await loadUsers(true);
      else if (tab === 'database') {
        await loadCollections();
        if (selectedCollection) await loadDocs(selectedCollection, true, appliedUid, null);
      } else if (tab === 'providers') await loadProviderUsage();
    } finally {
      setRefreshing(false);
    }
  }, [
    appliedUid,
    loadCollections,
    loadDocs,
    loadOverview,
    loadProviderUsage,
    loadUsers,
    selectedCollection,
    tab,
  ]);

  const goBack = () => navigation.goBack();

  if (!isDeveloper) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Developer</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          {!accessChecked ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <>
              <Text style={styles.deniedTitle}>Developer access required</Text>
              <Text style={styles.deniedSub}>
                This area is only available to server-granted developer accounts.
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={goBack} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Go back</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (accessDenied) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Developer</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <Text style={styles.deniedTitle}>Developer access revoked</Text>
          <Text style={styles.deniedSub}>
            Your developer status is no longer active. The dashboard is now hidden.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={goBack} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderOverview = () => {
    if (overviewLoading && !overview) return <Loading label="Loading overview..." />;
    if (overviewError && !overview) {
      return <ErrorBox message={overviewError} onRetry={loadOverview} />;
    }
    const root = overview ?? {};
    const identity =
      root.developer ?? root.admin ?? root.currentDeveloper ?? root;
    const uid = pickField(identity, ['uid', 'developerUid', 'adminUid', 'id']);
    const email = pickField(identity, ['email', 'developerEmail', 'adminEmail']);
    const entries =
      root && typeof root === 'object' && !Array.isArray(root)
        ? Object.entries(root)
        : [];

    return (
      <>
        <View style={styles.identityCard}>
          <DeveloperBadge />
          <Text style={styles.identityTitle}>Developer account</Text>
          {email ? <Text style={styles.identityLine}>{String(email)}</Text> : null}
          {uid ? (
            <Text style={styles.identityMono} selectable>
              {String(uid)}
            </Text>
          ) : null}
        </View>
        {overviewError ? <ErrorBox message={overviewError} onRetry={loadOverview} /> : null}
        {entries.length > 0 ? (
          entries.map(([key, value]) => (
            <SectionCard key={key} title={humanize(key)} value={value} />
          ))
        ) : (
          <SectionCard title="Server overview" value={root} />
        )}
      </>
    );
  };

  const renderUserDetail = () => {
    if (userDetailLoading) return <Loading label="Loading user..." />;
    if (userDetailError) {
      return <ErrorBox message={userDetailError} onRetry={() => selectedUid && openUser(selectedUid)} />;
    }
    const detail = userDetail ?? {};
    const hasSections = USER_DETAIL_SECTIONS.some(
      (section) => pickField(detail, section.keys) !== undefined,
    );

    return (
      <>
        <TouchableOpacity
          style={styles.inlineBack}
          onPress={() => {
            setSelectedUid(null);
            setUserDetail(null);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.inlineBackText}>← Back to users</Text>
        </TouchableOpacity>
        <View style={styles.identityCard}>
          <Text style={styles.identityTitle}>
            {displayValue(pickField(detail, ['email', 'displayName', 'uid']))}
          </Text>
          <Text style={styles.identityMono} selectable>
            {selectedUid}
          </Text>
        </View>
        {hasSections
          ? USER_DETAIL_SECTIONS.map((section) => {
              const value = pickField(detail, section.keys);
              return value !== undefined ? (
                <SectionCard
                  key={section.label}
                  title={section.label}
                  value={value}
                />
              ) : null;
            })
          : <SectionCard title="User detail" value={detail} />}
      </>
    );
  };

  const renderUsers = () => {
    if (selectedUid) return renderUserDetail();
    if (usersLoading && users.length === 0) return <Loading label="Loading users..." />;
    if (usersError && users.length === 0) {
      return <ErrorBox message={usersError} onRetry={() => loadUsers(true)} />;
    }

    return (
      <>
        {usersError ? <ErrorBox message={usersError} onRetry={() => loadUsers(true)} /> : null}
        {users.length === 0 ? (
          <Text style={styles.emptyText}>No users found.</Text>
        ) : (
          users.map((user, index) => {
            const uid = String(
              pickField(user, ['uid', 'userId', 'id']) ?? `user-${index}`,
            );
            const email = pickField(user, ['email']);
            const displayName = pickField(user, ['displayName', 'name']);
            const disabled = user?.disabled === true;
            const createdAt =
              pickField(user, ['createdAt', 'created', 'creationTime', 'created_at']) ??
              pickField(user?.metadata, ['creationTime', 'createdAt']);
            const lastSignIn =
              pickField(user, ['lastSignIn', 'lastSignInTime', 'lastLoginAt', 'last_sign_in']) ??
              pickField(user?.metadata, ['lastSignInTime', 'lastLoginAt']);
            const canOpen = Boolean(pickField(user, ['uid', 'userId', 'id']));

            return (
              <TouchableOpacity
                key={`${uid}-${index}`}
                style={styles.listCard}
                onPress={() => canOpen && openUser(uid)}
                activeOpacity={canOpen ? 0.82 : 1}
              >
                <View style={styles.listTop}>
                  <View style={styles.listCopy}>
                    <Text style={styles.listTitle} numberOfLines={1}>
                      {displayValue(displayName ?? email ?? uid)}
                    </Text>
                    <Text style={styles.listMono} selectable numberOfLines={1}>
                      {uid}
                    </Text>
                    {email ? (
                      <Text style={styles.listMeta} numberOfLines={1}>
                        {String(email)}
                      </Text>
                    ) : null}
                  </View>
                  {disabled ? (
                    <View style={styles.disabledBadge}>
                      <Text style={styles.disabledBadgeText}>DISABLED</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.listMeta} numberOfLines={2}>
                  Created: {displayValue(createdAt)} · Last sign-in: {displayValue(lastSignIn)}
                </Text>
                {canOpen ? <Text style={styles.listChevron}>›</Text> : null}
              </TouchableOpacity>
            );
          })
        )}
        {usersToken ? (
          <TouchableOpacity
            style={[styles.loadMoreBtn, usersLoading && styles.btnDisabled]}
            onPress={() => loadUsers(false)}
            disabled={usersLoading}
            activeOpacity={0.85}
          >
            {usersLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.loadMoreText}>Load more</Text>
            )}
          </TouchableOpacity>
        ) : usersLoaded ? (
          <Text style={styles.endText}>End of results</Text>
        ) : null}
      </>
    );
  };

  const renderDatabase = () => {
    if (collectionsLoading && collectionList.length === 0) {
      return <Loading label="Loading collections..." />;
    }
    if (collectionsError && collectionList.length === 0) {
      return <ErrorBox message={collectionsError} onRetry={loadCollections} />;
    }

    return (
      <>
        {collectionsError ? <ErrorBox message={collectionsError} onRetry={loadCollections} /> : null}

        <Text style={styles.blockLabel}>Collections</Text>
        {collectionList.length === 0 ? (
          <Text style={styles.emptyText}>No collections found.</Text>
        ) : (
          <View style={styles.chipWrap}>
            {collectionList.map((collection) => {
              const active = selectedCollection === collection.name;
              return (
                <TouchableOpacity
                  key={collection.name}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => openCollection(collection.name)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {collection.name}
                    {typeof collection.count === 'number' ? ` (${collection.count})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {selectedCollection ? (
          <>
            <Text style={styles.blockLabel}>Filter by uid</Text>
            <View style={styles.filterRow}>
              <TextInput
                style={styles.filterInput}
                value={uidFilter}
                onChangeText={setUidFilter}
                placeholder="Optional user uid"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={applyUidFilter}
              />
              <TouchableOpacity style={styles.filterBtn} onPress={applyUidFilter} activeOpacity={0.85}>
                <Text style={styles.filterBtnText}>Apply</Text>
              </TouchableOpacity>
              {appliedUid ? (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => {
                    setUidFilter('');
                    setAppliedUid('');
                    setDocs([]);
                    setDocsCursor(null);
                    setDocsLoaded(false);
                    loadDocs(selectedCollection, true, '', null);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.clearBtnText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={styles.blockLabel}>
              Documents · {selectedCollection}
              {appliedUid ? ` · uid=${appliedUid}` : ''}
            </Text>

            {docsError ? (
              <ErrorBox
                message={docsError}
                onRetry={() => loadDocs(selectedCollection, true, appliedUid, null)}
              />
            ) : null}

            {docsLoading && docs.length === 0 ? (
              <Loading label="Loading documents..." />
            ) : docs.length === 0 ? (
              <Text style={styles.emptyText}>No documents found.</Text>
            ) : (
              docs.map((doc, index) => {
                const docId =
                  pickField(doc, ['id', '_id', 'docId', 'documentId']) ?? `doc-${index}`;
                return (
                  <View key={`${docId}-${index}`} style={styles.docCard}>
                    <Text style={styles.docId} selectable numberOfLines={1}>
                      {displayValue(docId)}
                    </Text>
                    <JsonView value={doc} />
                  </View>
                );
              })
            )}

            {docsCursor ? (
              <TouchableOpacity
                style={[styles.loadMoreBtn, docsLoading && styles.btnDisabled]}
                onPress={() =>
                  selectedCollection && loadDocs(selectedCollection, false, appliedUid, docsCursor)
                }
                disabled={docsLoading}
                activeOpacity={0.85}
              >
                {docsLoading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={styles.loadMoreText}>Load more</Text>
                )}
              </TouchableOpacity>
            ) : docsLoaded ? (
              <Text style={styles.endText}>End of results</Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.emptyText}>Pick a collection to browse its documents.</Text>
        )}
      </>
    );
  };

  const renderProviders = () => {
    if (providerLoading && !providerUsage) return <Loading label="Loading provider usage..." />;
    if (providerError && !providerUsage) {
      return <ErrorBox message={providerError} onRetry={loadProviderUsage} />;
    }

    const root = providerUsage?.providers ?? providerUsage?.providerUsage ?? providerUsage ?? {};
    const present = Object.keys(PROVIDER_ALIASES).filter((key) =>
      PROVIDER_ALIASES[key].some((alias) => root?.[alias] !== undefined),
    );

    return (
      <>
        {providerError ? <ErrorBox message={providerError} onRetry={loadProviderUsage} /> : null}
        {present.length === 0 ? (
          <SectionCard title="Provider usage" value={root} />
        ) : (
          present.map((key) => {
            const value = pickField(root, PROVIDER_ALIASES[key]);
            const fields = PROVIDER_FIELDS[key] ?? [];
            const rows = fields
              .map((field) => ({
                label: field.label,
                value: pickField(value, field.keys),
              }))
              .filter((row) => row.value !== undefined);
            const isErrorRow = (label: string) => label === 'Errors';

            return (
              <View key={key} style={styles.card}>
                <Text style={styles.cardHeading}>{humanize(key)}</Text>
                {rows.length > 0 ? (
                  rows.map((row) => (
                    <View key={row.label} style={styles.kvRow}>
                      <Text style={styles.kvLabel}>{row.label}</Text>
                      <Text
                        style={[styles.kvValue, isErrorRow(row.label) && styles.kvDanger]}
                        selectable
                      >
                        {displayValue(row.value)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No summary fields returned.</Text>
                )}
                <Text style={styles.rawLabel}>Raw response</Text>
                <JsonView value={value} />
              </View>
            );
          })
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Developer</Text>
        <DeveloperBadge compact />
      </View>

      <View style={styles.tabsRow}>
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => selectTab(item.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {tab === 'overview' && renderOverview()}
        {tab === 'users' && renderUsers()}
        {tab === 'database' && renderDatabase()}
        {tab === 'providers' && renderProviders()}
        <Text style={styles.footerNote}>Read-only · actions are disabled by design</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: colors.primary,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: { color: colors.onPrimary, fontSize: 18, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.onPrimary },
  headerSpacer: { width: 36 },

  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.onPrimary },

  scroll: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 48 },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.background,
  },
  centerText: { marginTop: 12, fontSize: 13, color: colors.textMuted },

  deniedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  deniedSub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  primaryBtnText: { color: colors.onPrimary, fontSize: 14, fontWeight: '700' },

  identityCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: 16,
    marginBottom: 12,
  },
  identityTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 8 },
  identityLine: { fontSize: 13, color: colors.textSubtle, marginTop: 4 },
  identityMono: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    fontFamily: MONO_FONT,
  },

  card: {
    backgroundColor: colors.onPrimary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  cardDanger: { borderColor: colors.dangerBorder, backgroundColor: colors.dangerBg },
  cardHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDarker,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  cardHeadingDanger: { color: colors.danger },
  json: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.text,
    fontFamily: MONO_FONT,
  },

  listCard: {
    backgroundColor: colors.onPrimary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  listTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  listCopy: { flex: 1, minWidth: 0 },
  listTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  listMono: {
    fontSize: 10,
    color: colors.textMuted,
    fontFamily: MONO_FONT,
    marginTop: 2,
  },
  listMeta: { fontSize: 11, color: colors.textSubtle, marginTop: 3 },
  listChevron: {
    position: 'absolute',
    right: 10,
    top: 10,
    fontSize: 20,
    color: colors.primary,
    fontWeight: '700',
  },
  disabledBadge: {
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  disabledBadgeText: { fontSize: 9, fontWeight: '800', color: colors.danger, letterSpacing: 0.5 },

  inlineBack: { paddingVertical: 8, marginBottom: 4 },
  inlineBackText: { fontSize: 13, color: colors.primary, fontWeight: '700' },

  blockLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: 6,
    marginBottom: 8,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    backgroundColor: colors.onPrimary,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.primaryDarker },
  chipTextActive: { color: colors.onPrimary },

  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  filterInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.onPrimary,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.text,
  },
  filterBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  filterBtnText: { color: colors.onPrimary, fontSize: 12, fontWeight: '700' },
  clearBtn: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  clearBtnText: { color: colors.textSubtle, fontSize: 12, fontWeight: '700' },

  docCard: {
    backgroundColor: colors.onPrimary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  docId: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDarker,
    fontFamily: MONO_FONT,
    marginBottom: 8,
  },

  loadMoreBtn: {
    backgroundColor: colors.onPrimary,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  loadMoreText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  endText: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.textFaint,
    marginTop: 6,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
    lineHeight: 18,
  },

  errorBox: {
    backgroundColor: colors.dangerBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    padding: 14,
    marginBottom: 12,
  },
  errorText: { fontSize: 13, color: colors.danger, fontWeight: '600', lineHeight: 19 },
  retryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 9,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 10,
  },
  retryBtnText: { color: colors.onPrimary, fontSize: 12, fontWeight: '700' },

  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  kvLabel: { fontSize: 12, color: colors.textSubtle, fontWeight: '600' },
  kvValue: { flex: 1, textAlign: 'right', fontSize: 12, color: colors.text },
  kvDanger: { color: colors.danger, fontWeight: '700' },
  rawLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textFaint,
    letterSpacing: 0.6,
    marginTop: 12,
    marginBottom: 6,
  },

  footerNote: {
    textAlign: 'center',
    fontSize: 10,
    color: colors.textFaint,
    marginTop: 12,
  },
});
