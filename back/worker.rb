require 'socket'
require 'timeout'
require 'sidekiq'

class Worker
  include Sidekiq::Worker

  def perform(address)
    ip_and_port = parse_address(address)
    get_server_info(ip_and_port, $redis)
  end

  private

  def parse_address(address)
    ip_and_port = address.split(':')
    { ip: ip_and_port[0], port: ip_and_port[1].to_i }
  end

  def get_server_info(address, redis)
    data = redis.get_server_info("#{address[:ip]}:#{address[:port]}")

    return data if data

    data = check_server(address[:ip], address[:port])
    redis.set_server_info("#{address[:ip]}:#{address[:port]}", data)
    'ok'
  end

  def check_server(ip, port)
    server_info = { status: 'Offline', date: Time.now.strftime('%FT%TZ') }
    ping_start = Time.now
    data = get_server_data(ip, port)
    ping_finish = Time.now
    return server_info if data.nil?

    ping = (ping_finish - ping_start) * 1000.0
    server_info.merge!(parse_server_data(data))
    server_info.merge!({ ping: ping.to_i })
  rescue
    server_info
  end

  def get_server_data(ip, port)
    Timeout.timeout(1) do
      mcs_tcp = Socket.tcp(ip, port)
      mcs_tcp << "\xFE\x01"
      first_byte = mcs_tcp.recv(1)
      size = first_byte.bytes.first
      mcs_tcp.recv(size - 1)
    end
  end

  def parse_server_data(data)
    fields = data.force_encoding('UTF-16BE').encode('UTF-8').split("\u0000")
    {
      version: fields[2],
      description: fields[3],
      now: fields[4],
      max: fields[5],
      status: 'Online'
    }
  end
end
