<?php

namespace Hexmedia\AdministratorBundle\Entity;

use Doctrine\ORM\Mapping as ORM;
use Gedmo\Mapping\Annotation as Gedmo;

/**
 * Configuration
 *
 * @ORM\Entity(repositoryClass="Hexmedia\AdministratorBundle\Repository\ConfigurationRepository")
 * @ORM\Table(name="app_config")
 * @Gedmo\Loggable
 */
class Configuration {

	/**
	 * Default locale
	 *
	 * @var string
	 *
	 * @Gedmo\Locale
	 */
	private $locale = "pl";

	/**
	 * @var integer
	 *
	 * @ORM\Column(type="integer")
	 * @ORM\Id
	 * @ORM\GeneratedValue(strategy="AUTO")
	 */
	private $id;

	/**
	 * @var string
	 *
	 * @ORM\Column(length=255)
	 */
	private $name;

	/**
	 * @var string
	 *
	 * @ORM\Column(length=255)
	 */
	private $value;

	/**
	 * @var string
	 *
	 * @ORM\Column(length=5000)
	 * @Gedmo\Translatable
	 */
	private $description;

	/**
	 * @var \DateTime
	 *
	 * @ORM\Column(type="datetime")
	 * @Gedmo\Timestampable(on="create")
	 */
	private $created;

	/**
	 * @var \DateTime
	 *
	 * @ORM\Column(type="datetime", nullable=true)
	 * @Gedmo\Timestampable(on="update")
	 */
	private $modified;

	/**
	 * @var User
	 *
	 * @ORM\ManyToOne(targetEntity="Hexmedia\UserBundle\Entity\User")
	 */
	private $admin;

	/**
	 * Get id
	 *
	 * @return integer
	 */
	public function getId() {
		return $this->id;
	}

	/**
	 * Set name
	 *
	 * @param string $name
	 * @return Configuration
	 */
	public function setName($name) {
		$this->name = $name;

		return $this;
	}

	/**
	 * Get name
	 *
	 * @return string
	 */
	public function getName() {
		return $this->name;
	}

	/**
	 * Set value
	 *
	 * @param string $value
	 * @return Configuration
	 */
	public function setValue($value) {
		$this->value = $value;

		return $this;
	}

	/**
	 * Get value
	 *
	 * @return string
	 */
	public function getValue() {
		return $this->value;
	}

	/**
	 * Set description
	 *
	 * @param string $description
	 * @return Configuration
	 */
	public function setDescription($description) {
		$this->description = $description;

		return $this;
	}

	/**
	 * Get description
	 *
	 * @return string
	 */
	public function getDescription() {
		return $this->description;
	}

	/**
	 * Set created
	 *
	 * @param \DateTime $created
	 * @return OrderComment
	 */
	public function setCreated($created) {
		$this->created = $created;

		return $this;
	}

	/**
	 * Get created
	 *
	 * @return \DateTime
	 */
	public function getCreated() {
		return $this->created;
	}

	/**
	 * Set modified
	 *
	 * @param \DateTime $modified
	 * @return OrderComment
	 */
	public function setModified($modified) {
		$this->modified = $modified;

		return $this;
	}

	/**
	 * Get modified
	 *
	 * @return \DateTime
	 */
	public function getModified() {
		return $this->modified;
	}

	/**
	 * Set admin who last modified
	 *
	 * @param User $admin
	 * @return Configuration
	 */
	public function setAdmin(User $admin) {
		$this->admin = $admin;
		return $this;
	}

	/**
	 * Get admin who last modified
	 *
	 * @return User
	 */
	public function getAdmin() {
		return $this->admin;
	}

	/**
	 * Set locale for translations
	 *
	 * @param string $locale
	 * @return \Hexmedia\SimpleShopBundle\Entity\OrderProducts
	 */
	public function setTranslatableLocale($locale) {
		$this->locale = $locale;
		return $this;
	}

}
