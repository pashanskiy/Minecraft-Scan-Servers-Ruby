require 'sinatra'
require 'securerandom'
require 'pry'
require 'sidekiq'
require './storage'
require './worker'

set :port, 8080
set :public_folder, '../front/dist'

$redis = Storage.new('localhost')

Sidekiq.configure_server do |config|
  config.redis = { url: 'redis://localhost:6379/0' }
end

get('/') do
  send_file('../front/dist/index.html')
end

get('/api') do
  user_id = request.cookies['session']

  return '' if user_id.nil?

  user_ips = $redis.get_user_queue(user_id)

  return { done: 0 }.to_json if user_ips.empty?

  list = data_from_redis(user_ips, $redis)
  done = list.size == user_ips.size ? '1' : '0'
  progress = ((list.size.to_f / user_ips.size) * 100).to_i.to_s

  { done: done, progress: progress, data: list }.to_json
end

post('/api') do
  request.body.rewind
  json = JSON.parse(request.body.read, symbolize_names: true)
  ips = json[:ips].map { |address| parse_address(address, json[:port]) }.compact
  id = SecureRandom.uuid
  $redis.set_user_queue(id, ips)

  ips.each do |address|
    Worker.perform_async(address)
  end

  response.set_cookie(:session, value: id)
  nil
end

def parse_address(address, default_port)
  ip, port = address.split(':', 2)
  regexp_ip = /^(?:(?:[0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}(?:[0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/
  port = (port || default_port).to_i

  return if ip.nil? || port < 0 || port > 65_535 || !ip.match?(regexp_ip)

  "#{ip}:#{port}"
end

def data_from_redis(ip_list, redis)
ip_list.map do |ip|
  data = redis.get_server_info(ip)

  next if data.nil?

  [data[:status], ip.split(':').first, ip.split(':').last, data[:version], data[:now], data[:max], data[:description], data[:ping]].map(&:to_s)
end.compact
end