-- =====================================================================
-- AsifOps Knowledge Base — Seed Data
-- Run AFTER schema.sql. Replace the github_username below with your own
-- GitHub login (must match ALLOWED_GITHUB_USERNAME in your env vars).
-- =====================================================================

insert into users (github_id, github_username, name)
values ('seed-user', 'your-github-username', 'Asif')
on conflict (github_id) do nothing;

-- handy tag set
insert into tags (name) values
  ('nextcloud'),('redis'),('mariadb'),('openvpn'),('ipsec'),('strongswan'),
  ('frr'),('bgp'),('gcp'),('aws'),('docker'),('kubernetes'),('ldap'),
  ('backup'),('backuppc'),('monitoring'),('susemlm')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------
-- Articles
-- ---------------------------------------------------------------------
insert into articles (title, description, category, content)
values
(
  'Nextcloud + Redis: fixing slow file listing and lock errors',
  'Diagnosing and resolving Nextcloud performance issues caused by a misconfigured Redis cache/locking backend.',
  'Nextcloud',
$md$## Symptom
File listing in Nextcloud becomes slow under load, and the logs show
`Storage not available` or `Lock to storage acquired by another process` errors.

## Cause
Redis is used for both **file locking** and **memcache**, but only memcache
was configured in `config.php`. Without distributed locking, concurrent
requests collide.

## Fix
Add both blocks to `config/config.php`:

```php
'memcache.local' => '\OC\Memcache\APCu',
'memcache.distributed' => '\OC\Memcache\Redis',
'memcache.locking' => '\OC\Memcache\Redis',
'redis' => [
  'host' => '127.0.0.1',
  'port' => 6379,
  'timeout' => 1.5,
],
```

Restart php-fpm and check the Redis connection:

```bash
redis-cli ping
occ status
```

## Verification
- `occ files:scan` no longer reports lock errors
- `redis-cli info clients` shows persistent connections from php-fpm
$md$
),
(
  'OpenVPN: clients connect but have no internet access',
  'Routing/NAT checklist for an OpenVPN server where tunnels establish but clients cannot reach the internet.',
  'OpenVPN',
$md$## Symptom
Client connects, gets an IP from the VPN subnet, but cannot browse the internet.

## Checklist
1. **IP forwarding enabled on the server**
   ```bash
   sysctl net.ipv4.ip_forward
   # should return 1; if not:
   sysctl -w net.ipv4.ip_forward=1
   ```
2. **NAT/MASQUERADE rule present**
   ```bash
   iptables -t nat -L -n -v
   iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE
   ```
3. **Server config pushes a route + DNS**
   ```
   push "redirect-gateway def1 bypass-dhcp"
   push "dhcp-option DNS 1.1.1.1"
   ```
4. **Confirm traffic actually reaches tun0**
   ```bash
   tcpdump -ni tun0
   ```

## Resolution
Most commonly it's #1 or #2 — `ip_forward` reverted after reboot (not
persisted in `/etc/sysctl.conf`), or the MASQUERADE rule was never
persisted with `iptables-save`/`netfilter-persistent`.
$md$
),
(
  'strongSwan / IPsec: tunnel up but no traffic passing',
  'Debugging an IKEv2 strongSwan tunnel that negotiates successfully but passes no traffic.',
  'IPsec',
$md$## Symptom
`ipsec status` shows the tunnel as `ESTABLISHED`, but pings across the
tunnel time out.

## Diagnosis
```bash
ipsec statusall
ip xfrm state
ip xfrm policy
journalctl -u strongswan -f
```

Look for:
- Mismatched **local/remote subnets** (`leftsubnet` / `rightsubnet`) vs
  what the peer actually proposes — phase 2 selectors must match exactly.
- Missing `iptables` ACCEPT rules on the `ipsecX` / physical interface for
  ESP traffic.

## Common root cause
`leftsubnet=10.10.0.0/24` on our side but the peer proposes
`10.10.0.0/16` — selectors don't match exactly, so phase 2 negotiates
narrowed-down empty SAs that never actually carry packets.

## Resolution
Align subnets exactly on both sides, restart the tunnel:
```bash
ipsec down tunnel-name
ipsec up tunnel-name
```
$md$
),
(
  'FRR + BGP: neighbor stuck in Active state',
  'Troubleshooting a BGP neighbor relationship that never reaches Established using FRR.',
  'BGP',
$md$## Symptom
`show bgp summary` shows the neighbor stuck in `Active` (never `Established`).

## Diagnosis
```bash
vtysh -c "show bgp neighbor <peer-ip>"
vtysh -c "show bgp summary"
tcpdump -ni eth0 tcp port 179
```

## Common causes
- TCP/179 blocked by a firewall between peers
- AS number mismatch (local `remote-as` doesn't match peer's actual ASN)
- Peer IP unreachable at the IGP/routing layer (check with `ping`/`traceroute`)

## Resolution
1. Confirm reachability: `ping <peer-ip>`
2. Confirm port reachability: `nc -zv <peer-ip> 179`
3. Verify `router bgp <ASN>` and `neighbor <ip> remote-as <peer-ASN>` match
   what the peer expects on both ends.
$md$
),
(
  'BackupPC: onboarding a new host',
  'Step-by-step checklist for adding a new client host to BackupPC.',
  'BackupPC',
$md$## Steps

1. Add SSH key exchange so the BackupPC server can reach the client
   passwordlessly as root (or a sudo-capable backup user).
   ```bash
   ssh-copy-id -i /etc/backuppc/id_rsa.pub root@newhost
   ```
2. Add the host stanza in `/etc/backuppc/hosts`:
   ```
   newhost   0   backupuser   0
   ```
3. Create a per-host config at `/etc/backuppc/pc/newhost.pl` (copy from a
   similar existing host, adjust `$Conf{XferMethod}`, include/exclude lists).
4. Run a manual full backup and watch the log:
   ```bash
   BackupPC_serverMesg backup newhost newhost user 1 manual
   tail -f /var/log/backuppc/LOG
   ```
5. Verify in the web UI that the backup completed and browse the file tree.

## Common gotchas
- `rsync` not installed on the client → install `rsync`.
- Host firewall blocking the BackupPC server's source IP.
$md$
),
(
  'MariaDB replication: replica stuck with Seconds_Behind_Master growing',
  'Diagnosing and recovering a lagging or broken MariaDB replica.',
  'MariaDB',
$md$## Symptom
`SHOW REPLICA STATUS\G` shows `Seconds_Behind_Master` climbing, or
`Replica_SQL_Running: No`.

## Diagnosis
```sql
SHOW REPLICA STATUS\G
```
Check `Last_SQL_Error` and `Last_SQL_Errno`.

Common errors:
- Duplicate key errors from a write that hit the replica directly
  (replica wasn't read-only).
- Disk I/O saturation slowing relay log apply.

## Resolution (duplicate key / data drift)
```sql
STOP REPLICA;
SET GLOBAL sql_slave_skip_counter = 1;  -- only for known-safe single-statement skips
START REPLICA;
```
For real drift, re-sync from a fresh `mariabackup`/`mysqldump` snapshot
rather than skipping repeatedly.

## Prevention
```sql
SET GLOBAL read_only = ON;
```
on all replicas, enforced at provisioning time.
$md$
)
on conflict do nothing;

-- tag the seeded articles
insert into article_tags (article_id, tag_id)
select a.id, t.id from articles a, tags t
where (a.title like 'Nextcloud%' and t.name in ('nextcloud','redis'))
   or (a.title like 'OpenVPN%' and t.name = 'openvpn')
   or (a.title like 'strongSwan%' and t.name in ('ipsec','strongswan'))
   or (a.title like 'FRR%' and t.name in ('frr','bgp'))
   or (a.title like 'BackupPC%' and t.name in ('backup','backuppc'))
   or (a.title like 'MariaDB%' and t.name = 'mariadb')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Runbooks
-- ---------------------------------------------------------------------
insert into runbooks (title, problem, symptoms, root_cause, diagnosis_steps, resolution_steps, verification_steps, prevention)
values
(
  'IPsec tunnel established but no traffic passes',
  'Site-to-site IPsec tunnel shows ESTABLISHED but no packets cross it.',
  '- ipsec status shows tunnel up
- Pings across the tunnel time out
- No errors in the IKE log after phase 1/2 complete',
  'Phase 2 traffic selectors (local/remote subnets) do not match exactly between the two peers, so negotiated SAs never carry real traffic.',
  '1. ipsec statusall
2. ip xfrm state / ip xfrm policy
3. journalctl -u strongswan -f
4. Compare leftsubnet/rightsubnet config against what the peer actually proposes',
  '1. Align leftsubnet/rightsubnet exactly on both sides
2. ipsec down <tunnel>
3. ipsec up <tunnel>
4. Re-check ip xfrm policy for the corrected selectors',
  '- ping across the tunnel succeeds
- ip xfrm state shows non-zero packet counters increasing',
  'Document exact subnet CIDRs per tunnel in the VPN inventory and review them whenever either side''s network changes.'
),
(
  'BGP neighbor stuck in Active (FRR)',
  'A configured BGP neighbor never reaches Established state.',
  '- show bgp summary shows neighbor in Active
- No BGP updates exchanged',
  'TCP/179 reachability is blocked, or remote-as / peer IP configuration mismatches what the peer expects.',
  '1. vtysh -c "show bgp neighbor <ip>"
2. ping <peer-ip>
3. nc -zv <peer-ip> 179
4. Confirm router bgp <ASN> and neighbor remote-as match on both sides',
  '1. Open TCP/179 on any firewall between peers
2. Correct remote-as mismatch if found
3. vtysh -c "clear bgp <ip>"',
  '- show bgp summary shows Established
- Routes appear in show bgp',
  'Keep a BGP peering table (ASN, peer IP, expected state) alongside the VPN/infra inventory.'
)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Commands
-- ---------------------------------------------------------------------
insert into commands (name, description, category, command, example_output)
values
(
  'Check IP forwarding',
  'Confirm whether the kernel is forwarding IPv4 packets between interfaces (required for VPN gateways/routers).',
  'Networking',
  'sysctl net.ipv4.ip_forward',
  'net.ipv4.ip_forward = 1'
),
(
  'List NAT table rules',
  'Show NAT/MASQUERADE rules with packet/byte counters — useful for VPN internet-access troubleshooting.',
  'Networking',
  'iptables -t nat -L -n -v',
  'Chain POSTROUTING (policy ACCEPT)
 pkts bytes target     prot opt in     out     source               destination
  120  9000 MASQUERADE  all  --  *      eth0    10.8.0.0/24          0.0.0.0/0'
),
(
  'Capture traffic on a tunnel interface',
  'Live packet capture on a VPN tunnel interface to confirm traffic is actually flowing.',
  'Networking',
  'tcpdump -ni tun0',
  'listening on tun0, link-type RAW (Raw IP), capture size 262144 bytes
12:00:01.123 IP 10.8.0.2 > 8.8.8.8: ICMP echo request'
),
(
  'Show strongSwan tunnel status',
  'Detailed status of all configured IPsec/strongSwan connections.',
  'IPsec',
  'ipsec statusall',
  'Security Associations (1 up, 0 connecting):
tunnel-name[1]: ESTABLISHED 4 minutes ago'
),
(
  'Show BGP summary (FRR)',
  'Quick view of all BGP neighbor states and prefix counts.',
  'BGP',
  'vtysh -c "show bgp summary"',
  'Neighbor   V   AS  MsgRcvd  MsgSent  State/PfxRcd
10.0.0.2    4  65001    120      118    Established'
),
(
  'Check MariaDB replica status',
  'Full replication status including lag and last SQL error.',
  'MariaDB',
  'mysql -e "SHOW REPLICA STATUS\G"',
  'Seconds_Behind_Master: 0
Replica_IO_Running: Yes
Replica_SQL_Running: Yes'
),
(
  'Test Redis connectivity',
  'Basic Redis liveness check, used when diagnosing Nextcloud caching/locking issues.',
  'Nextcloud',
  'redis-cli ping',
  'PONG'
),
(
  'Tail BackupPC log live',
  'Follow the BackupPC server log during a manual or scheduled backup run.',
  'BackupPC',
  'tail -f /var/log/backuppc/LOG',
  '2026-06-19 09:00:01 full backup started for newhost'
)
on conflict do nothing;

insert into command_tags (command_id, tag_id)
select c.id, t.id from commands c, tags t
where (c.name like '%IP forwarding%' and t.name = 'openvpn')
   or (c.name like '%NAT table%' and t.name = 'openvpn')
   or (c.name like '%tunnel interface%' and t.name in ('openvpn','ipsec'))
   or (c.name like '%strongSwan%' and t.name in ('ipsec','strongswan'))
   or (c.name like '%BGP summary%' and t.name in ('bgp','frr'))
   or (c.name like '%MariaDB replica%' and t.name = 'mariadb')
   or (c.name like '%Redis%' and t.name in ('redis','nextcloud'))
   or (c.name like '%BackupPC%' and t.name in ('backup','backuppc'))
on conflict do nothing;
