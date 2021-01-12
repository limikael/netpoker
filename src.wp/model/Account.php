<?php

namespace netpoker;

class Account {
	private $currency;
	private $entityType;
	private $entityId;

	public function __construct($currency, $entityType, $entityId) {
		$this->currency=$currency;
		$this->entityType=$entityType;
		$this->entityId=$entityId;
	}

	public function getCurrency() {
		return $this->currency;
	}

	public function getBalance() {
		if ($this->currency=="ply") {
			if ($this->entityType=="user" && $this->currency=="ply") {
				$balance=get_user_meta($this->entityId,"netpoker_ply_balance",TRUE);
				if (!$balance)
					$balance=0;

				return $balance;
			}

			else if ($this->entityType=="cashgame") {
				$balance=get_post_meta($this->entityId,"netpoker_ply_balance",TRUE);
				if (!$balance)
					$balance=0;

				return $balance;
			}
		}

		throw new \Exception("Unknown entity/currecny/id.");
	}

	public function saveBalance($balance) {
		if ($this->currency=="ply") {
			if ($this->entityType=="user" && $this->currency=="ply") {
				update_user_meta($this->entityId,"netpoker_ply_balance",$balance);
				return;
			}

			else if ($this->entityType=="cashgame") {
				update_post_meta($this->entityId,"netpoker_ply_balance",$balance);
				return;
			}
		}

		throw new \Exception("Unknown entity/currecny/id.");
	}

	public static function getUserPlyAccount($userId) {
		$user=get_user_by("id",$userId);
		if (!$user)
			throw new \Exception("User not found");

		return new Account("ply","user",$userId);
	}

	public static function transact($fromAccount, $toAccount, $amount) {
		$amount=intval($amount);

		if ($fromAccount->getCurrency()!=$toAccount->getCurrency())
			throw new \Exception("Different currecny");

		$fromBalance=$fromAccount->getBalance();
		$toBalance=$toAccount->getBalance();

		$fromBalance-=$amount;
		$toBalance+=$amount;

		if ($fromBalance<0)
			throw new \Exception("Insufficient funds");

		$fromAccount->saveBalance($fromBalance);
		$toAccount->saveBalance($toBalance);
	}
}