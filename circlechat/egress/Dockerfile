# The outgoing filter for agent containers and port jobs: Squid from Ubuntu's LTS packages.
# The allowlist, the one-time consents and the logs come in as mounted folders.
FROM ubuntu:25.10
RUN apt-get update && apt-get install -y --no-install-recommends squid-openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /var/log/egress && chown proxy:proxy /var/log/egress
COPY ERR_EGRESS_BLOCKED /usr/share/squid/errors/templates/ERR_EGRESS_BLOCKED
EXPOSE 3128
CMD ["squid", "-N", "-f", "/etc/egress/squid.conf"]
