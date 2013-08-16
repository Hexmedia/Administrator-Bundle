<?php

namespace Hexmedia\AdministratorBundle\Repository\Doctrine;

use Doctrine\ORM\EntityRepository;
use Hexmedia\AdministratorBundle\Repository\ConfigurationRepositoryInterface;

/**
 * ConfigurationRepository
 *
 * This class was generated by the Doctrine ORM. Add your own custom
 * repository methods below.
 */
class ConfigurationRepository extends EntityRepository implements ConfigurationRepositoryInterface {

	public function getPage($page = 1, $sort = 'id', $pageSize = 10, $sortDirection = 'ASC', $fields = array()) {

	}

	public function getCount() {

	}

}
