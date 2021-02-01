require 'redis'
require 'pry'

class Storage
  def initialize(host)
    @redis = Redis.new(host: host)
    @ttl = 7_200
  end

  def set_user_queue(user_id, ips)
    @redis.setex("user:#{user_id}", @ttl, ips.to_json)
  end

  def get_user_queue(user_id)
    ips = @redis.get("user:#{user_id}")

    return [] if ips.nil?

    JSON.parse(ips, symbolize_names: true)
  end

  def set_server_info(ip, info)
    @redis.setex("server:#{ip}", @ttl, info.to_json)
  end

  def get_server_info(ip)
    info = @redis.get("server:#{ip}")
    return if info.nil?

    JSON.parse(info, symbolize_names: true)
  end
end
